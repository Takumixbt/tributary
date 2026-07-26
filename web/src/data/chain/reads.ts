/*
 * One-shot contract reads. Zone: src/data/**.
 *
 * Reads the vault views, the registry roster and every router's cumulative
 * counters, then maps them into the same VaultState and AgentState the simulator
 * produces. Amounts stay bigint the whole way through: an intermediate Number
 * would silently round a six-decimal balance.
 *
 * Series are left flat here. The stream owns history, because a single read has
 * none: it accumulates buckets as it polls.
 */

import { createPublicClient, fallback, http, type PublicClient } from "viem";
import { arcTestnet } from "viem/chains";
import { RPC_URLS } from "../../lib/env";
import { emptySeries } from "../../lib/stream";
import type { Address, AgentHealth, AgentState, LineStatus, Micro, VaultState } from "../../lib/types";
import { registryAbi, routerAbi, vaultAbi } from "./abi";

/*
 * A fallback over every configured endpoint. Building the roster fires one read
 * per agent plus a line read and two router reads each, and the public Arc
 * testnet RPC rate-limits that burst: without a second endpoint a single
 * dropped agentList call left the whole roster empty. viem walks the list per
 * request, so the failure costs a retry instead of the page.
 */
export const publicClient: PublicClient = createPublicClient({
  chain: arcTestnet,
  transport: fallback(
    RPC_URLS.map((url) => http(url, { batch: true, retryCount: 2 })),
    { rank: false },
  ),
});

const MICRO = 1_000_000n;

/** Roster metadata the registry stores as a URI. Optional, and never trusted. */
interface AgentMeta {
  label?: string;
  service?: string;
  unitPrice?: string | number;
}

function fallbackLabel(address: Address): string {
  return `AGENT-${address.slice(-4).toUpperCase()}`;
}

/**
 * metadataURI is free-form. When it carries JSON (inline or as a data URI) the
 * label and service come from there, which is what the seller agent writes. Any
 * other value falls back to an address-derived handle rather than showing a raw
 * URL in a table cell.
 */
function readMeta(uri: string): AgentMeta {
  if (!uri) return {};
  const body = uri.startsWith("data:") ? uri.slice(uri.indexOf(",") + 1) : uri;
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) return {};
  try {
    const parsed = JSON.parse(trimmed) as AgentMeta;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export async function readVault(vault: Address): Promise<VaultState | null> {
  try {
    const [totalAssets, availableLiquidity, totalShares, totalPrincipal] = await Promise.all([
      publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "totalAssets" }),
      publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "availableLiquidity" }),
      publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "totalShares" }),
      publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "totalPrincipal" }),
    ]);

    const assets = totalAssets as Micro;
    const shares = totalShares as bigint;
    const principal = totalPrincipal as Micro;

    return {
      address: vault,
      totalAssets: assets,
      availableLiquidity: availableLiquidity as Micro,
      totalPrincipal: principal,
      totalShares: shares,
      sharePrice: shares > 0n ? (assets * MICRO) / shares : MICRO,
      utilizationBps: assets > 0n ? Number((principal * 10_000n) / assets) : 0,
      apyBps: 0,
      interestEarned: 0n,
      drawnTotal: 0n,
      repaidTotal: 0n,
      lenderCount: 0,
      agentsFunded: 0,
      assetsSeries: emptySeries(),
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * The roster. `vault` is optional so the registry can be read on its own, but
 * without it there are no line terms and every agent reads as unfunded.
 */
export async function readRoster(registry: Address, vault?: Address): Promise<AgentState[]> {
  try {
    const count = (await publicClient.readContract({
      address: registry,
      abi: registryAbi,
      functionName: "agentCount",
    })) as bigint;

    const total = Number(count);
    if (total === 0) return [];

    const addresses = (await Promise.all(
      Array.from({ length: total }, (_, i) =>
        publicClient.readContract({
          address: registry,
          abi: registryAbi,
          functionName: "agentList",
          args: [BigInt(i)],
        }),
      ),
    )) as Address[];

    const rows = await Promise.all(
      addresses.map(async (address) => {
        const record = (await publicClient.readContract({
          address: registry,
          abi: registryAbi,
          functionName: "agents",
          args: [address],
        })) as readonly [Address, bigint, number, bigint, string];

        const [router, erc8004Id, score, scoredAt, metadataURI] = record;
        const meta = readMeta(metadataURI);

        const [revenueTotal, repaidTotal] = await Promise.all([
          publicClient
            .readContract({ address: router, abi: routerAbi, functionName: "cumulativeRevenue" })
            .catch(() => 0n),
          publicClient
            .readContract({ address: router, abi: routerAbi, functionName: "cumulativeRepaid" })
            .catch(() => 0n),
        ]);

        let limit = 0n;
        let principal = 0n;
        let accruedInterest = 0n;
        let aprBps = 0;
        let repaymentBps = 0;
        let lineStatus: LineStatus = "none";

        if (vault) {
          const line = (await publicClient
            .readContract({ address: vault, abi: vaultAbi, functionName: "lines", args: [address] })
            .catch(() => null)) as
            | readonly [Address, bigint, bigint, bigint, bigint, number, number, boolean]
            | null;
          if (line) {
            limit = line[1];
            principal = line[2];
            accruedInterest = line[3];
            aprBps = Number(line[5]);
            repaymentBps = Number(line[6]);
            lineStatus = line[7] ? "active" : limit > 0n ? "closed" : "none";
          }
        }

        const debt = principal + accruedInterest;
        /*
         * Health has to come off the wire, and the wire only carries terms. A
         * line the underwriter has throttled is visible as a raised repayment
         * share; debt sitting on an inactive line is a loss in progress.
         */
        const health: AgentHealth =
          lineStatus !== "active" && debt > 0n
            ? "delinquent"
            : repaymentBps >= 3500
              ? "throttled"
              : "healthy";

        const agent: AgentState = {
          address,
          router,
          label: meta.label ?? fallbackLabel(address),
          service: meta.service ?? "x402 service",
          unitPrice: meta.unitPrice ? BigInt(meta.unitPrice) : 0n,
          erc8004Id: Number(erc8004Id),
          score: Number(score),
          scoredAt: Number(scoredAt) * 1000,
          scoreReason: "",
          revenueTotal: revenueTotal as Micro,
          revenue24h: 0n,
          repaidTotal: repaidTotal as Micro,
          debt,
          principal,
          accruedInterest,
          limit,
          aprBps,
          repaymentBps,
          lineStatus,
          health,
          paymentsTotal: 0,
          paymentsPerMin: 0,
          lastPaymentAt: 0,
          revenueSeries: emptySeries(),
        };
        return agent;
      }),
    );

    return rows.sort((a, b) => b.score - a.score || Number(b.revenueTotal - a.revenueTotal));
  } catch {
    return [];
  }
}
