/**
 * Demo buyer: another agent that consumes the seller's risk reports and pays
 * per query with gasless nanopayments from its Gateway balance on Arc Testnet.
 *
 * Usage: pnpm buyer [count] [tokenAddress]
 */
import { GatewayClient } from "@circle-fin/x402-batching/client";

const count = Number(process.argv[2] ?? 5);
const token = process.argv[3] ?? "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT as a default subject
const base = process.env.SELLER_URL ?? "http://localhost:3402";

const buyerKey = process.env.BUYER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
if (!buyerKey) throw new Error("Set BUYER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) in .env");

const client = new GatewayClient({
  chain: "arcTestnet",
  privateKey: buyerKey as `0x${string}`,
});

const balances = await client.getBalances();
console.log(`Buyer ${client.account.address}`);
console.log(`Wallet USDC: ${balances.wallet.formatted}, Gateway available: ${balances.gateway.formattedAvailable}`);

// One-time top-up so the buyer can pay gaslessly afterwards
if (balances.gateway.available < 1_000_000n) {
  console.log("Gateway balance low, depositing 2 USDC (one-time onchain tx)...");
  const dep = await client.deposit("2");
  console.log(`Deposited, tx: ${dep.depositTxHash}`);
}

let spent = 0n;
for (let i = 1; i <= count; i++) {
  const { data, status } = await client.pay(`${base}/api/risk/${token}`);
  const report = (data as { report?: { riskGrade?: string } })?.report;
  spent += 20_000n; // $0.02 in 6-decimal units
  console.log(`[${i}/${count}] HTTP ${status}, grade ${report?.riskGrade ?? "?"}, total spent ${Number(spent) / 1e6} USDC`);
}

const after = await client.getBalances();
console.log(`Done. Gateway available now: ${after.gateway.formattedAvailable} USDC`);
