/**
 * The underwriter agent: the autonomous lender side of Tributary.
 *
 * Decision logic tied to real signals, evaluated every cycle for each
 * registered agent:
 *   - lifetime routed revenue and debt service (RevenueRouter telemetry)
 *   - live Gateway earnings not yet withdrawn (Circle Gateway API)
 *   - current debt and utilization (TributaryVault)
 *
 * From those it posts a 0-1000 credit score onchain with the reasoning, and
 * opens/resizes the agent's credit line: limits scale with observed revenue,
 * rates fall as scores rise, and lines throttle when inflows stall.
 *
 * Usage: pnpm underwriter [--once]
 */
import { formatUnits, type Address } from "viem";
import { GatewayClient } from "@circle-fin/x402-batching/client";
import { publicClient, walletFor, VAULT, REGISTRY, requireAddress } from "./config.ts";
import { vaultAbi, registryAbi, routerAbi } from "./abi.ts";

const vault = requireAddress(VAULT, "VAULT_ADDRESS");
const registry = requireAddress(REGISTRY, "REGISTRY_ADDRESS");
const { account, client: wallet } = walletFor("UNDERWRITER_PRIVATE_KEY");
const once = process.argv.includes("--once");
const INTERVAL_MS = 30_000;

// Policy knobs (basis points, USDC 6-decimal units)
const REPAYMENT_BPS = 2000;         // 20% of revenue services debt
const MAX_LIMIT = 200_000_000n;     // 200 USDC cap per agent on testnet
const LIMIT_TO_REVENUE_BPS = 5000n; // lend up to 50% of observed lifetime revenue

type Signals = {
  cumRevenue: bigint;
  cumRepaid: bigint;
  gatewayPending: bigint;
  debt: bigint;
  limit: bigint;
  active: boolean;
};

async function readSignals(agent: Address, router: Address): Promise<Signals> {
  const [cumRevenue, cumRepaid, line, debtInfo] = await Promise.all([
    publicClient.readContract({ address: router, abi: routerAbi, functionName: "cumulativeRevenue" }),
    publicClient.readContract({ address: router, abi: routerAbi, functionName: "cumulativeRepaid" }),
    publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "lines", args: [agent] }),
    publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "debtInfo", args: [agent] }),
  ]);
  // Live earnings still sitting in the agent's Gateway balance
  let gatewayPending = 0n;
  try {
    const gc = new GatewayClient({
      chain: "arcTestnet",
      privateKey: process.env.UNDERWRITER_PRIVATE_KEY as `0x${string}`,
    });
    gatewayPending = (await gc.getBalances(agent)).gateway.available;
  } catch {
    // Gateway API unreachable: score on onchain telemetry alone
  }
  return {
    cumRevenue,
    cumRepaid,
    gatewayPending,
    debt: debtInfo[0],
    limit: line[1],
    active: line[7],
  };
}

/** 0-1000. Volume earns the base, debt service earns the trust. */
function scoreOf(s: Signals): { score: number; reason: string } {
  const revenueUsdc = Number(formatUnits(s.cumRevenue + s.gatewayPending, 6));
  const volumeScore = Math.min(600, Math.round(200 * Math.log10(1 + revenueUsdc * 10)));
  const repaymentRatio = s.cumRevenue > 0n ? Number(s.cumRepaid) / Number(s.cumRevenue) : 0;
  const serviceScore = Math.min(300, Math.round(repaymentRatio * 1500));
  const cleanBonus = s.cumRepaid > 0n && s.debt === 0n ? 100 : 0;
  const score = Math.min(1000, volumeScore + serviceScore + cleanBonus);
  const reason =
    `rev=${revenueUsdc.toFixed(2)}USDC pending=${formatUnits(s.gatewayPending, 6)} ` +
    `serviced=${formatUnits(s.cumRepaid, 6)} debt=${formatUnits(s.debt, 6)}`;
  return { score, reason };
}

function limitOf(s: Signals, score: number): bigint {
  if (score < 100) return 0n; // no observable revenue, no credit
  let limit = ((s.cumRevenue + s.gatewayPending) * LIMIT_TO_REVENUE_BPS) / 10_000n;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  return limit;
}

function aprOf(score: number): number {
  // 25% APR floor-to-ceiling band: strong scores borrow cheaper
  return Math.max(500, 2500 - score * 2);
}

async function evaluate(agent: Address, router: Address) {
  const s = await readSignals(agent, router);
  const { score, reason } = scoreOf(s);
  const limit = limitOf(s, score);
  const apr = aprOf(score);

  console.log(`\n[${new Date().toISOString()}] agent ${agent}`);
  console.log(`  signals: ${reason}`);
  console.log(`  decision: score=${score} limit=${formatUnits(limit, 6)}USDC apr=${apr / 100}%`);

  const scoreTx = await wallet.writeContract({
    address: registry,
    abi: registryAbi,
    functionName: "setScore",
    args: [agent, score, reason],
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash: scoreTx });

  if (!s.active && limit > 0n) {
    const tx = await wallet.writeContract({
      address: vault,
      abi: vaultAbi,
      functionName: "openLine",
      args: [agent, router, limit, apr, REPAYMENT_BPS],
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`  opened line: ${formatUnits(limit, 6)} USDC at ${apr / 100}% APR`);
  } else if (s.active && limit !== s.limit) {
    const tx = await wallet.writeContract({
      address: vault,
      abi: vaultAbi,
      functionName: "updateLine",
      args: [agent, limit, apr, REPAYMENT_BPS],
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    const direction = limit > s.limit ? "raised" : "throttled";
    console.log(`  ${direction} line to ${formatUnits(limit, 6)} USDC at ${apr / 100}% APR`);
  }
}

async function cycle() {
  const count = await publicClient.readContract({
    address: registry,
    abi: registryAbi,
    functionName: "agentCount",
  });
  for (let i = 0n; i < count; i++) {
    const agent = await publicClient.readContract({
      address: registry,
      abi: registryAbi,
      functionName: "agentList",
      args: [i],
    });
    const router = await publicClient.readContract({
      address: registry,
      abi: registryAbi,
      functionName: "routerOf",
      args: [agent],
    });
    await evaluate(agent, router);
  }
}

console.log(`Underwriter agent ${account.address} watching vault ${vault}`);
await cycle();
if (!once) {
  setInterval(() => cycle().catch((e) => console.error("cycle failed:", e.message)), INTERVAL_MS);
}
