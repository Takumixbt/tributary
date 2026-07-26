/**
 * One-shot demo setup after contract deployment:
 *   1. The agent registers itself in the AgentRegistry (deploys its router).
 *   2. The lender (deployer wallet for the demo) deposits USDC into the vault.
 *
 * Prints the router address to add to .env as ROUTER_ADDRESS.
 *
 * Usage: pnpm setup [lenderDepositUsdc]
 */
import { formatUnits, parseUnits, decodeEventLog } from "viem";
import { publicClient, walletFor, VAULT, REGISTRY, USDC, requireAddress } from "./config.ts";
import { vaultAbi, registryAbi, erc20Abi } from "./abi.ts";

const vault = requireAddress(VAULT, "VAULT_ADDRESS");
const registry = requireAddress(REGISTRY, "REGISTRY_ADDRESS");
const depositUsdc = process.argv[2] ?? "50";

// 1. Agent self-registration
const agent = walletFor("AGENT_PRIVATE_KEY");
const existing = await publicClient.readContract({
  address: registry,
  abi: registryAbi,
  functionName: "routerOf",
  args: [agent.account.address],
});

let router = existing;
if (existing === "0x0000000000000000000000000000000000000000") {
  const hash = await agent.client.writeContract({
    address: registry,
    abi: registryAbi,
    functionName: "register",
    args: [0n, "tributary-demo: token risk reports at $0.02/query over x402"],
    account: agent.account,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: registryAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "AgentRegistered") router = ev.args.router;
    } catch {}
  }
  console.log(`Agent ${agent.account.address} registered, router deployed at ${router}`);
} else {
  console.log(`Agent already registered, router at ${router}`);
}
console.log(`>>> add to .env: ROUTER_ADDRESS=${router}`);

// 2. Lender deposit
const lender = walletFor("DEPLOYER_PRIVATE_KEY");
const amount = parseUnits(depositUsdc, 6);
const balance = await publicClient.readContract({
  address: USDC,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [lender.account.address],
});
if (balance < amount) {
  console.log(`Lender has ${formatUnits(balance, 6)} USDC, wanted ${depositUsdc}. Skipping deposit.`);
} else {
  const approveTx = await lender.client.writeContract({
    address: USDC,
    abi: erc20Abi,
    functionName: "approve",
    args: [vault, amount],
    account: lender.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  const depositTx = await lender.client.writeContract({
    address: vault,
    abi: vaultAbi,
    functionName: "deposit",
    args: [amount],
    account: lender.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: depositTx });
  const totalAssets = await publicClient.readContract({
    address: vault,
    abi: vaultAbi,
    functionName: "totalAssets",
  });
  console.log(`Lender deposited ${depositUsdc} USDC. Vault totalAssets: ${formatUnits(totalAssets, 6)} USDC`);
}
