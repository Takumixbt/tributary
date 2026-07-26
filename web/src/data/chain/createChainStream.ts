/*
 * The chain reader. Zone: src/data/**.
 *
 * Same contract as the simulator, backed by viem. Reads build the world, watchers
 * keep it moving: RevenueSplit on every known router, Drawn, Repaid, LineOpened,
 * LineUpdated, Deposited and Withdrawn on the vault, AgentRegistered and
 * ScoreUpdated on the registry.
 *
 * Nanopayments themselves settle in Circle Gateway rather than on chain, so
 * PaymentEvents are inferred from each split total and the agent's unit price and
 * attributed to GATEWAY rather than to a buyer we cannot see. Everything else is
 * a real log.
 *
 * If a read throws or nothing arrives for 15 seconds the status goes to stalled
 * with a reason and the last snapshot stays on screen. A frozen terminal that
 * admits it is frozen beats one that lies.
 */

import { formatBps, formatUsdc } from "../../lib/format";
import { createEventHub, emptySnapshot, emptyStats, emptyVaultState, ZERO_ADDRESS } from "../../lib/stream";
import type {
  Address,
  AgentState,
  Micro,
  StreamSnapshot,
  StreamStats,
  UnderwriterAction,
  VaultState,
} from "../../lib/types";
import type { TributaryStream } from "../types";
import { registryAbi, routerAbi, vaultAbi } from "./abi";
import { publicClient, readRoster, readVault } from "./reads";

export interface ChainStreamOptions {
  addresses: { vault: Address | null; registry: Address | null; router: Address | null };
  rpcUrl: string;
}

const REFRESH_MS = 6_000;
const BUCKETS = 48;
const STALL_MS = 15_000;
/** Cap on payments inferred from one split, so a large flush cannot flood the tape. */
const MAX_INFERRED = 12;

export function createChainStream(options: ChainStreamOptions): TributaryStream {
  const { vault, registry } = options.addresses;
  const hub = createEventHub({
    mode: "chain",
    source: options.rpcUrl,
    snapshot: emptySnapshot("chain", vault ?? ZERO_ADDRESS),
    historyLimit: 600,
  });

  let running = false;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  let watchdog: ReturnType<typeof setInterval> | null = null;
  const unwatch: Array<() => void> = [];

  let vaultState: VaultState = emptyVaultState(vault ?? ZERO_ADDRESS);
  let agents: AgentState[] = [];
  const byAddress = new Map<Address, AgentState>();
  const byRouter = new Map<Address, AgentState>();

  const revenueBuckets = new Map<Address, number[]>();
  const lastRevenue = new Map<Address, Micro>();
  const paymentTimes = new Map<Address, number[]>();
  const paymentCounts = new Map<Address, number>();
  const assetsBuckets = new Array<number>(BUCKETS).fill(0);

  let stats: StreamStats = emptyStats();
  let featured: Address | null = null;
  let featuredLocked = false;
  let startedAt = Date.now();
  let lastEventAt = 0;

  // ------------------------------------------------------------------ mapping

  const reindex = () => {
    byAddress.clear();
    byRouter.clear();
    for (const agent of agents) {
      byAddress.set(agent.address, agent);
      if (agent.router && agent.router !== ZERO_ADDRESS) byRouter.set(agent.router, agent);
    }
  };

  const bucketsFor = (address: Address): number[] => {
    let series = revenueBuckets.get(address);
    if (!series) {
      series = new Array<number>(BUCKETS).fill(0);
      revenueBuckets.set(address, series);
    }
    return series;
  };

  const patch = (address: Address, next: Partial<AgentState>) => {
    const current = byAddress.get(address);
    if (!current) return;
    const merged = { ...current, ...next };
    byAddress.set(address, merged);
    agents = agents.map((agent) => (agent.address === address ? merged : agent));
    if (merged.router) byRouter.set(merged.router, merged);
  };

  const snapshot = (note?: string): StreamSnapshot => ({
    at: Date.now(),
    mode: "chain",
    status: hub.status,
    vault: vaultState,
    agents,
    buyers: [],
    lenders: [],
    stats,
    featuredAgent: featured ?? agents[0]?.address ?? null,
    ...(note ? { note } : {}),
  });

  const publish = (note?: string) => hub.setSnapshot(snapshot(note));

  const recomputeStats = () => {
    let scored = 0;
    let sum = 0;
    let active = 0;
    const now = Date.now();
    for (const agent of agents) {
      if (agent.score > 0) {
        scored += 1;
        sum += agent.score;
      }
      if (now - agent.lastPaymentAt < 120_000) active += 1;
    }
    stats = {
      ...stats,
      activeAgents: active,
      avgScore: scored > 0 ? Math.round(sum / scored) : 0,
      uptimeMs: now - startedAt,
      paymentsPerMin: [...paymentTimes.values()].reduce(
        (total, times) => total + times.filter((t) => now - t <= 60_000).length,
        0,
      ),
    };
  };

  // -------------------------------------------------------------------- reads

  async function refresh(): Promise<void> {
    if (!vault || !registry) return;
    const [nextVault, nextRoster] = await Promise.all([readVault(vault), readRoster(registry, vault)]);

    if (!nextVault) {
      hub.setStatus("stalled", "vault reads are not answering");
      publish("vault reads are not answering");
      return;
    }

    // Roll the assets series on the read cadence: a single read carries no history.
    assetsBuckets.shift();
    assetsBuckets.push(Number(nextVault.totalAssets));

    vaultState = {
      ...nextVault,
      interestEarned: vaultState.interestEarned,
      drawnTotal: vaultState.drawnTotal,
      repaidTotal: vaultState.repaidTotal,
      lenderCount: vaultState.lenderCount,
      agentsFunded: nextRoster.filter((agent) => agent.lineStatus !== "none").length,
      apyBps:
        nextVault.totalAssets > 0n
          ? Math.round(
              nextRoster.reduce((total, agent) => total + Number(agent.principal) * agent.aprBps, 0) /
                Number(nextVault.totalAssets),
            )
          : 0,
      assetsSeries: { bucketMs: REFRESH_MS, values: assetsBuckets.slice() },
    };

    const now = Date.now();
    agents = nextRoster.map((agent) => {
      const series = bucketsFor(agent.address);
      const previous = lastRevenue.get(agent.address);
      const delta = previous === undefined ? 0n : agent.revenueTotal - previous;
      lastRevenue.set(agent.address, agent.revenueTotal);
      series.shift();
      series.push(Math.max(0, Number(delta)));

      const times = paymentTimes.get(agent.address) ?? [];
      const kept = times.filter((t) => now - t <= 60_000);
      paymentTimes.set(agent.address, kept);

      const held = byAddress.get(agent.address);
      let trailing = 0n;
      for (const value of series) trailing += BigInt(Math.max(0, Math.round(value)));

      return {
        ...agent,
        scoreReason: held?.scoreReason ?? agent.scoreReason,
        revenue24h: trailing,
        revenueSeries: { bucketMs: REFRESH_MS, values: series.slice() },
        paymentsTotal: paymentCounts.get(agent.address) ?? 0,
        paymentsPerMin: kept.length,
        lastPaymentAt: held?.lastPaymentAt ?? 0,
        health: held?.health ?? agent.health,
      };
    });
    reindex();

    if (!featuredLocked) featured = agents[0]?.address ?? null;
    recomputeStats();
    if (hub.status !== "live" && lastEventAt > 0) hub.setStatus("live");
    publish();
  }

  // ----------------------------------------------------------------- watchers

  /**
   * Nanopayments settle off chain, so a split total is the only evidence they
   * happened. Turning it back into individual payments keeps the tape and the
   * graph honest about scale without inventing buyers.
   */
  function inferPayments(agent: AgentState, total: Micro, at: number, txHash?: `0x${string}`): void {
    if (total <= 0n) return;
    const unit = agent.unitPrice > 0n ? agent.unitPrice : 0n;
    const guess = unit > 0n ? Number(total / unit) : 1;
    const count = Math.max(1, Math.min(MAX_INFERRED, Math.round(guess) || 1));
    const each = total / BigInt(count);
    const remainder = total - each * BigInt(count);

    const times = paymentTimes.get(agent.address) ?? [];
    for (let i = 0; i < count; i++) {
      const amount = i === 0 ? each + remainder : each;
      if (amount <= 0n) continue;
      times.push(at);
      stats = {
        ...stats,
        paymentsTotal: stats.paymentsTotal + 1,
        volumeTotal: stats.volumeTotal + amount,
        smallestPayment:
          stats.smallestPayment === 0n || amount < stats.smallestPayment ? amount : stats.smallestPayment,
      };
      hub.emit("payment", {
        buyer: ZERO_ADDRESS,
        buyerLabel: "GATEWAY",
        agent: agent.address,
        router: agent.router,
        amount,
        service: agent.service,
        at: at - (count - i) * 40,
        ...(txHash ? { txHash } : {}),
      });
    }
    paymentTimes.set(agent.address, times);
    paymentCounts.set(agent.address, (paymentCounts.get(agent.address) ?? 0) + count);
    patch(agent.address, { lastPaymentAt: at });
  }

  function markLive(): void {
    lastEventAt = Date.now();
    if (hub.status !== "live") hub.setStatus("live");
  }

  function watchAll(): void {
    if (!vault || !registry) return;

    unwatch.push(
      publicClient.watchContractEvent({
        address: vault,
        abi: vaultAbi,
        poll: true,
        pollingInterval: 2_000,
        onLogs: (logs) => {
          for (const log of logs) {
            const at = Date.now();
            markLive();
            const name = (log as { eventName?: string }).eventName;
            const args = (log as { args?: Record<string, unknown> }).args ?? {};
            const tx = log.transactionHash ?? undefined;

            if (name === "Drawn") {
              vaultState = { ...vaultState, drawnTotal: vaultState.drawnTotal + (args.amount as Micro) };
              hub.emit("draw", {
                agent: args.agent as Address,
                amount: args.amount as Micro,
                principalAfter: args.principalAfter as Micro,
                purpose: "working capital",
                at,
                ...(tx ? { txHash: tx } : {}),
              });
            } else if (name === "Repaid") {
              const interestPaid = args.interestPaid as Micro;
              const principalPaid = args.principalPaid as Micro;
              const agent = byAddress.get(args.agent as Address);
              vaultState = {
                ...vaultState,
                interestEarned: vaultState.interestEarned + interestPaid,
                repaidTotal: vaultState.repaidTotal + interestPaid + principalPaid,
              };
              hub.emit("repay", {
                agent: args.agent as Address,
                payer: args.payer as Address,
                interestPaid,
                principalPaid,
                debtAfter: agent ? agent.debt : 0n,
                at,
                ...(tx ? { txHash: tx } : {}),
              });
            } else if (name === "Deposited" || name === "Withdrawn") {
              const inbound = name === "Deposited";
              vaultState = { ...vaultState, lenderCount: Math.max(vaultState.lenderCount, 1) };
              hub.emit("deposit", {
                lender: args.lender as Address,
                lenderLabel: `LENDER-${(args.lender as Address).slice(-4).toUpperCase()}`,
                assets: args.assets as Micro,
                shares: args.shares as bigint,
                direction: inbound ? "in" : "out",
                at,
                ...(tx ? { txHash: tx } : {}),
              });
            } else if (name === "LineOpened" || name === "LineUpdated") {
              const address = args.agent as Address;
              const agent = byAddress.get(address);
              const limit = args.limit as Micro;
              const aprBps = Number(args.aprBps);
              const repaymentBps = Number(args.repaymentBps);
              const action: UnderwriterAction =
                name === "LineOpened" ? "opened" : agent && limit > agent.limit ? "raised" : "held";
              const reason = `line ${action === "opened" ? "opened" : "updated"} at ${formatUsdc(limit)} USDC, APR ${formatBps(aprBps)}, ${formatBps(repaymentBps)} of every payment routed to the vault until it clears.`;
              if (agent) patch(address, { limit, aprBps, repaymentBps, lineStatus: "active", scoreReason: reason });
              hub.emit("score", {
                agent: address,
                score: agent?.score ?? 0,
                previousScore: agent?.score ?? 0,
                reason,
                limit,
                previousLimit: agent?.limit ?? 0n,
                aprBps,
                action,
                at,
                ...(tx ? { txHash: tx } : {}),
              });
            } else if (name === "LineClosed") {
              patch(args.agent as Address, { lineStatus: "closed", limit: 0n, repaymentBps: 0 });
            } else if (name === "WrittenOff") {
              patch(args.agent as Address, { lineStatus: "written-off", health: "delinquent" });
            }
          }
          recomputeStats();
          publish();
        },
        onError: (error) => {
          hub.setStatus("stalled", `vault watcher: ${error.message}`);
          publish(`vault watcher: ${error.message}`);
        },
      }),
    );

    unwatch.push(
      publicClient.watchContractEvent({
        address: registry,
        abi: registryAbi,
        poll: true,
        pollingInterval: 2_000,
        onLogs: (logs) => {
          for (const log of logs) {
            const at = Date.now();
            markLive();
            const name = (log as { eventName?: string }).eventName;
            const args = (log as { args?: Record<string, unknown> }).args ?? {};
            const tx = log.transactionHash ?? undefined;

            if (name === "AgentRegistered") {
              const address = args.agent as Address;
              hub.emit("register", {
                agent: address,
                router: args.router as Address,
                label: `AGENT-${address.slice(-4).toUpperCase()}`,
                service: "x402 service",
                erc8004Id: Number(args.erc8004Id ?? 0),
                score: 0,
                at,
                ...(tx ? { txHash: tx } : {}),
              });
              void refresh();
            } else if (name === "ScoreUpdated") {
              const address = args.agent as Address;
              const agent = byAddress.get(address);
              const score = Number(args.score);
              const reason = (args.reason as string) || "score posted by the underwriter";
              const previous = agent?.score ?? 0;
              patch(address, { score, scoredAt: at, scoreReason: reason });
              hub.emit("score", {
                agent: address,
                score,
                previousScore: previous,
                reason,
                limit: agent?.limit ?? 0n,
                previousLimit: agent?.limit ?? 0n,
                aprBps: agent?.aprBps ?? 0,
                action: score > previous ? "raised" : score < previous ? "throttled" : "held",
                at,
                ...(tx ? { txHash: tx } : {}),
              });
            }
          }
          recomputeStats();
          publish();
        },
        onError: (error) => {
          hub.setStatus("stalled", `registry watcher: ${error.message}`);
          publish(`registry watcher: ${error.message}`);
        },
      }),
    );

    /*
     * Routers are watched by event signature rather than by address, so a router
     * deployed after this stream started still lands on the tape. Logs from an
     * unknown router are dropped, not guessed at.
     */
    unwatch.push(
      publicClient.watchContractEvent({
        abi: routerAbi,
        eventName: "RevenueSplit",
        poll: true,
        pollingInterval: 2_000,
        onLogs: (logs) => {
          for (const log of logs) {
            const agent = byRouter.get(log.address as Address);
            if (!agent) continue;
            const at = Date.now();
            markLive();
            const args = (log as { args?: Record<string, unknown> }).args ?? {};
            const total = args.total as Micro;
            const toVault = args.toVault as Micro;
            const toAgent = args.toAgent as Micro;
            const tx = log.transactionHash ?? undefined;

            inferPayments(agent, total, at, tx);

            stats = {
              ...stats,
              splitsTotal: stats.splitsTotal + 1,
              routedToVault: stats.routedToVault + toVault,
            };
            hub.emit("split", {
              agent: agent.address,
              router: agent.router,
              total,
              toVault,
              toAgent,
              repaymentBps: total > 0n ? Number((toVault * 10_000n) / total) : 0,
              debtAfter: agent.debt > toVault ? agent.debt - toVault : 0n,
              at,
              ...(tx ? { txHash: tx } : {}),
            });
            if (agent.debt > 0n && agent.debt <= toVault) {
              hub.emit("cleared", {
                agent: agent.address,
                router: agent.router,
                totalRepaid: agent.repaidTotal + toVault,
                splitsToClear: 0,
                durationMs: 0,
                at: at + 1,
                ...(tx ? { txHash: tx } : {}),
              });
            }
          }
          recomputeStats();
          publish();
          void refresh();
        },
        onError: (error) => {
          hub.setStatus("stalled", `router watcher: ${error.message}`);
          publish(`router watcher: ${error.message}`);
        },
      }),
    );
  }

  // --------------------------------------------------------------- lifecycle

  const stream: TributaryStream = {
    mode: "chain",
    source: options.rpcUrl,
    get status() {
      return hub.status;
    },
    start() {
      if (running) return;
      running = true;
      startedAt = Date.now();

      if (!vault || !registry) {
        hub.setStatus("error", "vault and registry addresses are not configured");
        publish("vault and registry addresses are not configured");
        return;
      }

      hub.setStatus("idle", "reading the loan book");
      void refresh().then(() => {
        if (!running) return;
        watchAll();
      });

      refreshTimer = setInterval(() => void refresh(), REFRESH_MS);
      watchdog = setInterval(() => {
        if (!running || lastEventAt === 0) return;
        if (Date.now() - lastEventAt > STALL_MS) {
          const seconds = Math.round((Date.now() - lastEventAt) / 1000);
          hub.setStatus("stalled", `no router or vault activity for ${seconds}s`);
          publish(`no router or vault activity for ${seconds}s`);
        }
      }, 5_000);
    },
    stop() {
      running = false;
      if (refreshTimer) clearInterval(refreshTimer);
      if (watchdog) clearInterval(watchdog);
      refreshTimer = null;
      watchdog = null;
      for (const off of unwatch) {
        try {
          off();
        } catch {
          // A watcher that already tore itself down is not an error.
        }
      }
      unwatch.length = 0;
      hub.dispose();
    },
    setFeatured(address) {
      featured = address;
      featuredLocked = address !== null;
      publish();
    },
    subscribe: (listener) => hub.subscribe(listener),
    onSnapshot: (listener) => hub.onSnapshot(listener),
    history: (limit) => hub.history(limit),
    snapshot: () => hub.snapshot(),
  };

  return stream;
}
