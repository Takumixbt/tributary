/**
 * The borrowing agent's storefront: a token risk report service sold per
 * query over x402 nanopayments. Payments are gasless for the buyer and land
 * in this agent's Circle Gateway balance; the keeper periodically withdraws
 * them to the agent's RevenueRouter, where the Tributary split happens.
 */
import express, { type Request, type Response } from "express";
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import { createPublicClient, http, formatUnits, isAddress, type Address } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { GATEWAY_API, agentKey } from "./config.ts";

const PRICE = "$0.02";
const PORT = Number(process.env.SELLER_PORT ?? 3402);

type PaidRequest = Request & {
  payment?: { verified: boolean; payer: string; amount: string; network: string };
};

const agentAddress = privateKeyToAccount(agentKey()).address;

const gateway = createGatewayMiddleware({
  sellerAddress: agentAddress,
  facilitatorUrl: GATEWAY_API,
});

// Lightweight real checks against Ethereum mainnet for the queried token.
const eth = createPublicClient({ chain: mainnet, transport: http("https://eth.llamarpc.com") });
const EIP1967_IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

async function riskSnapshot(token: Address) {
  const [code, implSlot] = await Promise.all([
    eth.getCode({ address: token }).catch(() => undefined),
    eth.getStorageAt({ address: token, slot: EIP1967_IMPL_SLOT }).catch(() => undefined),
  ]);
  const isContract = !!code && code !== "0x";
  const isProxy = !!implSlot && implSlot !== `0x${"0".repeat(64)}`;
  const flags: string[] = [];
  if (!isContract) flags.push("address has no code on Ethereum mainnet");
  if (isProxy) flags.push("upgradeable proxy: implementation can change under holders");
  return {
    token,
    chain: "ethereum",
    isContract,
    isProxy,
    codeSize: isContract ? (code!.length - 2) / 2 : 0,
    flags,
    riskGrade: !isContract ? "n/a" : isProxy ? "B" : "A",
    generatedAt: new Date().toISOString(),
  };
}

const app = express();
let served = 0;

app.get("/api/risk/:token", gateway.require(PRICE), async (req: PaidRequest, res: Response) => {
  const token = req.params.token;
  if (!isAddress(token)) {
    res.status(400).json({ error: "invalid token address" });
    return;
  }
  const report = await riskSnapshot(token as Address);
  served += 1;
  const paid = req.payment ? formatUnits(BigInt(req.payment.amount), 6) : "?";
  console.log(`#${served} sold risk report for ${token} to ${req.payment?.payer} (${paid} USDC)`);
  res.json({ report, paidBy: req.payment?.payer });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, agent: agentAddress, price: PRICE, served });
});

app.listen(PORT, () => {
  console.log(`Seller agent ${agentAddress}`);
  console.log(`Selling token risk reports at ${PRICE} per query on http://localhost:${PORT}/api/risk/:token`);
});
