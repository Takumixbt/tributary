/**
 * Revenue keeper: moves the seller agent's Gateway earnings onchain into its
 * RevenueRouter, then calls flush() so the Tributary split executes. In
 * production this runs on a schedule; for the demo it runs once per call.
 *
 * Usage: pnpm keeper [minUsdc]
 */
import { GatewayClient } from "@circle-fin/x402-batching/client";
import { formatUnits } from "viem";
import { publicClient, walletFor, ROUTER, requireAddress } from "./config.ts";
import { routerAbi } from "./abi.ts";

const minUsdc = Number(process.argv[2] ?? 0.05);
const router = requireAddress(ROUTER, "ROUTER_ADDRESS");

const client = new GatewayClient({
  chain: "arcTestnet",
  privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
});

const balances = await client.getBalances();
const available = balances.gateway.available;
console.log(`Agent ${client.account.address} Gateway earnings: ${balances.gateway.formattedAvailable} USDC`);

if (available >= BigInt(Math.round(minUsdc * 1e6))) {
  const amount = formatUnits(available, 6);
  console.log(`Withdrawing ${amount} USDC from Gateway to router ${router}...`);
  const w = await client.withdraw(amount, { recipient: router, maxFee: "0.5" });
  console.log(`Withdrawal landed, tx: ${w.mintTxHash}`);
} else {
  console.log(`Below ${minUsdc} USDC threshold, skipping withdrawal.`);
}

// Flush whatever sits on the router (from this withdrawal or earlier ones)
const { account, client: wallet } = walletFor("AGENT_PRIVATE_KEY");
const routerBalancePre = await publicClient.readContract({
  address: router,
  abi: routerAbi,
  functionName: "cumulativeRevenue",
});

const hash = await wallet.writeContract({
  address: router,
  abi: routerAbi,
  functionName: "flush",
  account,
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`flush() tx ${hash} (${receipt.status})`);

const [cumRevenue, cumRepaid] = await Promise.all([
  publicClient.readContract({ address: router, abi: routerAbi, functionName: "cumulativeRevenue" }),
  publicClient.readContract({ address: router, abi: routerAbi, functionName: "cumulativeRepaid" }),
]);
console.log(
  `Router lifetime: ${formatUnits(cumRevenue, 6)} USDC revenue, ` +
    `${formatUnits(cumRepaid, 6)} USDC debt service ` +
    `(this run routed ${formatUnits(cumRevenue - routerBalancePre, 6)} USDC)`,
);
