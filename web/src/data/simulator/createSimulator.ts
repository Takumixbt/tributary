/*
 * The seeded simulator. Zone: src/data/**.
 *
 * Produces a live agent economy from nothing but a seed: nanopayments arriving
 * over x402, keeper flushes splitting them at each line's repayment share, draws
 * against credit, underwriter decisions with reasons, and clearances. It is the
 * primary mode, not a fallback: this is what runs in the demo video and in front
 * of judges when a testnet RPC decides to rate limit.
 *
 * Design decisions that matter here:
 *   - No clock of its own. The provider drives `tick` from the app's single
 *     requestAnimationFrame loop, so simulated time and painted time cannot drift.
 *   - Inter-arrival times are exponential. A metronome reads as fake instantly.
 *   - Amounts are log-uniform over four orders of magnitude, so the tape shows
 *     0.0003 and 0.24 USDC in the same minute and the nanopayment claim proves
 *     itself without a caption.
 *   - A payment and its split are separate events, and the vault-side repayment
 *     lands 260ms after the split, mirroring a Gateway withdrawal then a flush.
 *   - Every number the UI reads is the result of event math. Nothing walks
 *     randomly: share price is assets over shares, so it only moves when interest
 *     is actually paid.
 */

import { formatBps, formatRate, formatUsdc } from "../../lib/format";
import { clamp, damp } from "../../lib/motion";
import { createEventHub, emptySnapshot } from "../../lib/stream";
import type { Address, Micro, UnderwriterAction } from "../../lib/types";
import type { TributaryStream } from "../types";
import { BEATS, LOOP_SECONDS, type Beat } from "./choreography";
import {
  BUCKETS,
  BUCKET_MS,
  LATE_FIXTURES,
  MICRO,
  PROTAGONIST_FIXTURE,
  RATE_WINDOW_MS,
  YEAR_MS,
  createEconomy,
  debtOf,
  limitFor,
  aprFor,
  bookApy,
  deriveSnapshot,
  makeAgent,
  attachBuyers,
  nextGap,
  orderAmount,
  postedScore,
  ratePerMinute,
  revenuePerHour,
  scoreOf,
  shareFor,
  sharePriceOf,
  sortRoster,
  totalAssetsOf,
  type SimAgent,
} from "./economy";
import { AGENT_FIXTURES, DRAW_PURPOSES } from "./fixtures";
import { createRng } from "./prng";

export interface SimulatorOptions {
  seed: string;
  /** Wall-clock multiplier. 1 is real time. */
  speed?: number;
}

/** Snapshot publish cadence. The hub still coalesces to one frame. */
const PUBLISH_MS = 150;
/** Vault-side repayment lands after the split, so the fork animates first. */
const REPAY_DELAY_MS = 260;
const CLEAR_DELAY_MS = 420;
/** Longest slice of simulated time one frame may advance. */
const MAX_STEP_MS = 90;
/** Roster ceiling. Past this the graph stops being individually legible. */
const MAX_AGENTS = 9;

interface Deferred {
  in: number;
  run: () => void;
}

export function createSimulator(options: SimulatorOptions): TributaryStream {
  const rng = createRng(options.seed);
  const speed = clamp(options.speed ?? 1, 0.25, 4);
  const startedAt = Date.now();

  const economy = createEconomy(rng, startedAt);
  const hub = createEventHub({
    mode: "demo",
    source: options.seed,
    snapshot: emptySnapshot("demo", economy.vaultAddress),
    historyLimit: 600,
  });

  const deferred: Deferred[] = [];
  const buyersFor = new Map<Address, number[]>();
  let elapsed = 0;
  let phase = 0;
  let loop = 0;
  let sincePublish = PUBLISH_MS;
  let running = false;
  let protagonist: Address | null = null;
  let lastCleared: Address | null = null;
  let nextUnderwriterIn = 6_000;
  let nextLiquidityIn = 24_000;
  let underwriterCursor = 0;
  let now = startedAt;

  // ---------------------------------------------------------------- plumbing

  const indexBuyers = () => {
    buyersFor.clear();
    economy.buyers.forEach((buyer, i) => {
      for (const agent of buyer.buysFrom) {
        const list = buyersFor.get(agent);
        if (list) list.push(i);
        else buyersFor.set(agent, [i]);
      }
    });
  };
  indexBuyers();

  const publish = (force = false) => {
    if (!force && sincePublish < PUBLISH_MS) return;
    sincePublish = 0;
    hub.setSnapshot(deriveSnapshot(economy, now, "demo", hub.status));
  };

  const later = (ms: number, run: () => void) => deferred.push({ in: ms, run });

  /*
   * Publish the opening book at construction, not at start(). React renders once
   * before effects run, and a snapshot that is empty for that one frame paints
   * every panel's waiting state and then throws it away, which reads as a flash of
   * broken UI on every page load.
   */
  hub.setSnapshot(deriveSnapshot(economy, startedAt, "demo", "idle"));

  // ------------------------------------------------------------------ actions

  function payment(agent: SimAgent): void {
    const candidates = buyersFor.get(agent.address);
    if (!candidates || candidates.length === 0) return;
    const buyer = economy.buyers[candidates[rng.int(0, candidates.length - 1)]!]!;
    const amount = orderAmount(agent, rng);

    agent.pending += amount;
    agent.revenueTotal += amount;
    agent.paymentsTotal += 1;
    agent.lastPaymentAt = now;
    agent.paymentTimes.push(now);
    agent.revenueBuckets[BUCKETS - 1] += Number(amount);
    agent.dirty = true;

    buyer.paymentsTotal += 1;
    buyer.spendTotal += amount;
    buyer.lastPaymentAt = now;
    economy.peopleDirty = true;

    economy.paymentsTotal += 1;
    economy.volumeTotal += amount;
    economy.paymentTimes.push(now);
    if (economy.smallestPayment === 0n || amount < economy.smallestPayment) {
      economy.smallestPayment = amount;
    }

    hub.emit("payment", {
      buyer: buyer.address,
      buyerLabel: buyer.label,
      agent: agent.address,
      router: agent.router,
      amount,
      service: agent.service,
    });
  }

  function flush(agent: SimAgent): void {
    const total = agent.pending;
    if (total <= 0n) return;
    agent.pending = 0n;

    const debt = debtOf(agent);
    const lineLive = agent.lineStatus === "active" || agent.lineStatus === "throttled";
    let toVault = lineLive && debt > 0n ? (total * BigInt(agent.repaymentBps)) / 10_000n : 0n;
    if (toVault > debt) toVault = debt;
    const toAgent = total - toVault;

    const interestPaid = toVault < agent.accruedInterest ? toVault : agent.accruedInterest;
    let principalPaid = toVault - interestPaid;
    if (principalPaid > agent.principal) principalPaid = agent.principal;
    const applied = interestPaid + principalPaid;

    agent.accruedInterest -= interestPaid;
    agent.principal -= principalPaid;
    agent.repaidTotal += applied;
    agent.repaidSinceDraw += applied;
    agent.splitsSinceDraw += 1;
    agent.dirty = true;

    economy.idle += applied;
    economy.interestEarned += interestPaid;
    economy.repaidTotal += applied;
    economy.routedToVault += toVault;
    economy.splitsTotal += 1;
    economy.vaultDirty = true;

    const debtAfter = debtOf(agent);

    hub.emit("split", {
      agent: agent.address,
      router: agent.router,
      total,
      toVault,
      toAgent,
      repaymentBps: lineLive && debt > 0n ? agent.repaymentBps : 0,
      debtAfter,
    });

    if (applied > 0n) {
      later(REPAY_DELAY_MS, () => {
        hub.emit("repay", {
          agent: agent.address,
          payer: agent.router,
          interestPaid,
          principalPaid,
          debtAfter: debtOf(agent),
        });
      });
    }

    if (debtAfter === 0n && applied > 0n) clear(agent);
  }

  function clear(agent: SimAgent): void {
    const totalRepaid = agent.repaidSinceDraw;
    const splitsToClear = agent.splitsSinceDraw;
    const durationMs = Math.max(1, now - (agent.loanOpenedAt || agent.registeredAt));

    agent.loansCleared += 1;
    agent.repaidSinceDraw = 0n;
    agent.splitsSinceDraw = 0;
    agent.interestCarry = 0;
    if (agent.lineStatus === "throttled") agent.lineStatus = "active";
    agent.dirty = true;
    lastCleared = agent.address;

    later(CLEAR_DELAY_MS, () => {
      hub.emit("cleared", {
        agent: agent.address,
        router: agent.router,
        totalRepaid,
        splitsToClear,
        durationMs,
      });
      publish(true);
    });
    // A cleared loan is new information about the borrower. Re-price it.
    later(CLEAR_DELAY_MS + 1_600, () => underwrite(agent));
  }

  function draw(agent: SimAgent, requested: Micro, purpose: string): void {
    const headroom = agent.limit > debtOf(agent) ? agent.limit - debtOf(agent) : 0n;
    let amount = requested < headroom ? requested : headroom;
    const liquidity = (economy.idle * 7n) / 10n;
    if (amount > liquidity) amount = liquidity;
    amount = (amount / 10_000n) * 10_000n; // two decimals, like every posted figure
    if (amount <= 0n) return;

    if (debtOf(agent) === 0n) {
      agent.loanOpenedAt = now;
      agent.splitsSinceDraw = 0;
      agent.repaidSinceDraw = 0n;
    }
    agent.principal += amount;
    agent.drawnTotal += amount;
    agent.dirty = true;

    economy.idle -= amount;
    economy.drawnTotal += amount;
    economy.vaultDirty = true;

    hub.emit("draw", {
      agent: agent.address,
      amount,
      principalAfter: agent.principal,
      purpose,
    });
    publish(true);
  }

  function moveLiquidity(direction: "in" | "out"): void {
    const lender = economy.lenders[rng.int(0, economy.lenders.length - 1)]!;
    const price = sharePriceOf(economy);

    if (direction === "in") {
      const assets = BigInt(rng.int(900, 4_200)) * 10_000n; // 9.00 to 42.00 USDC
      const shares = (assets * MICRO) / price;
      economy.idle += assets;
      economy.shares += shares;
      lender.shares += shares;
      economy.vaultDirty = true;
      economy.peopleDirty = true;
      hub.emit("deposit", {
        lender: lender.address,
        lenderLabel: lender.label,
        assets,
        shares,
        direction: "in",
      });
    } else {
      let shares = (lender.shares * BigInt(rng.int(600, 2_200))) / 10_000n;
      let assets = (shares * price) / MICRO;
      const withdrawable = (economy.idle * 4n) / 10n;
      if (assets > withdrawable) {
        assets = withdrawable;
        shares = (assets * MICRO) / price;
      }
      if (assets <= 0n || shares <= 0n) return;
      economy.idle -= assets;
      economy.shares -= shares;
      lender.shares -= shares;
      economy.vaultDirty = true;
      economy.peopleDirty = true;
      hub.emit("deposit", {
        lender: lender.address,
        lenderLabel: lender.label,
        assets,
        shares,
        direction: "out",
      });
    }
    publish(true);
  }

  // -------------------------------------------------------------- underwriter

  function underwrite(agent: SimAgent, forced?: UnderwriterAction): void {
    const debt = debtOf(agent);
    const stale = now - agent.lastPaymentAt;
    const stalled = agent.stallFor > 0 || (debt > 0n && stale > 32_000);
    const model = scoreOf(agent, now);
    const posted = postedScore(agent.score, model);
    const previousLimit = agent.limit;
    const wasFlagged = agent.flagged;
    const wasThrottled = agent.lineStatus === "throttled";
    const assets = totalAssetsOf(economy);

    let action: UnderwriterAction = forced ?? "held";
    if (!forced) {
      // A raise has to actually change something, or it is a hold with extra words.
      const improves =
        limitFor(agent, posted, assets) > agent.limit || aprFor(posted) < agent.aprBps;
      if (stalled && agent.lineStatus !== "none") action = "throttled";
      else if (agent.lineStatus === "none") action = posted >= 300 ? "opened" : "held";
      else if (posted - agent.score >= 15 && improves) action = "raised";
    }

    switch (action) {
      case "opened": {
        agent.limit = limitFor(agent, posted, assets);
        agent.aprBps = aprFor(posted);
        agent.repaymentBps = shareFor(posted);
        agent.baseRepaymentBps = agent.repaymentBps;
        agent.lineStatus = "active";
        break;
      }
      case "raised": {
        const priced = limitFor(agent, posted, assets);
        agent.limit = priced > agent.limit ? priced : agent.limit;
        agent.aprBps = aprFor(posted);
        // The share is never re-cut mid-loan: a live loan keeps what it drew on.
        if (debt === 0n) {
          agent.baseRepaymentBps = shareFor(posted);
          agent.repaymentBps = agent.baseRepaymentBps;
        }
        if (agent.lineStatus === "throttled") agent.lineStatus = "active";
        agent.flagged = false;
        break;
      }
      case "throttled": {
        // A second throttle on an already throttled line is a flag, not a nudge.
        if (agent.lineStatus === "throttled" && !agent.flagged) {
          agent.flagged = true;
          agent.flaggedAt = now;
        }
        agent.lineStatus = "throttled";
        agent.repaymentBps = Math.min(4000, Math.max(agent.repaymentBps, agent.baseRepaymentBps) + 1000);
        break;
      }
      case "closed": {
        agent.lineStatus = "closed";
        agent.limit = 0n;
        agent.repaymentBps = 0;
        break;
      }
      default: {
        /*
         * A flag is not cleared on the first clean flush. Telemetry has to agree
         * with inflows for a while before the line comes off probation, which is
         * what makes the flag mean anything.
         */
        const recoverable =
          !stalled && ratePerMinute(agent.paymentTimes, now) > 0 && now - agent.flaggedAt > 45_000;
        if (agent.flagged && recoverable) {
          agent.flagged = false;
          agent.flaggedAt = 0;
        }
        if (!agent.flagged && agent.lineStatus === "throttled" && !stalled) {
          agent.lineStatus = "active";
          agent.repaymentBps = agent.baseRepaymentBps;
        }
        break;
      }
    }

    const reason = reasonFor(action, agent, previousLimit, stale, wasFlagged && !agent.flagged, wasThrottled);
    agent.previousScore = agent.score;
    // A throttle can hold or lower a score. It can never be good news.
    agent.score =
      action === "throttled" ? Math.min(agent.score, scoreOf(agent, now)) : posted;
    agent.scoredAt = now;
    agent.scoreReason = reason;
    agent.dirty = true;
    economy.vaultDirty = true;
    sortRoster(economy);

    hub.emit("score", {
      agent: agent.address,
      score: agent.score,
      previousScore: agent.previousScore,
      reason,
      limit: agent.limit,
      previousLimit,
      aprBps: agent.aprBps,
      action,
    });
    publish(true);
  }

  /**
   * The feed is a feed of sentences, so every reason is assembled from the same
   * live signals the decision was made on. Nothing here is a canned string with
   * a number dropped into it: change the economy and the sentences change.
   */
  function reasonFor(
    action: UnderwriterAction,
    agent: SimAgent,
    previousLimit: Micro,
    staleMs: number,
    recovered: boolean,
    wasThrottled: boolean,
  ): string {
    const perHour = revenuePerHour(agent);
    const rate = formatRate(ratePerMinute(agent.paymentTimes, now));
    const hours = (Number(agent.limit) / 1e6 / Math.max(perHour, 0.0001)).toFixed(1);
    const service =
      agent.splitsSinceDraw > 0
        ? `${agent.splitsSinceDraw} splits serviced on this loan with none missed`
        : `${agent.loansCleared} lines cleared with no missed splits`;

    switch (action) {
      case "opened":
        return `${formatUsdc(agent.limit)} USDC line, ${hours} hours of observed revenue at ${perHour.toFixed(2)} USDC per hour across ${agent.paymentsTotal.toLocaleString("en-US")} payments. No debt history yet, so the share opens at ${formatBps(agent.repaymentBps)}.`;
      case "raised": {
        const limitMove =
          agent.limit > previousLimit
            ? `Limit ${formatUsdc(previousLimit)} to ${formatUsdc(agent.limit)} USDC`
            : `Limit held at ${formatUsdc(agent.limit)} USDC by the concentration cap`;
        return `revenue ${perHour.toFixed(2)} USDC per hour at ${rate} calls per minute, ${service}. ${limitMove}, APR ${formatBps(agent.aprBps)}.`;
      }
      case "throttled":
        return `inflows stopped ${Math.round(staleMs / 1000)}s ago while the router kept reporting. Share raised to ${formatBps(agent.repaymentBps)} until Gateway telemetry matches the split again.`;
      case "closed":
        return `line closed. ${formatUsdc(agent.repaidTotal)} USDC of debt service returned against ${formatUsdc(agent.drawnTotal)} USDC drawn.`;
      default:
        if (recovered) {
          return `telemetry back in line with Gateway inflows for a full window, flag cleared. Revenue ${perHour.toFixed(2)} USDC per hour, share ${formatBps(agent.repaymentBps)}.`;
        }
        if (wasThrottled && agent.lineStatus === "active") {
          return `inflows match router telemetry again. Throttle lifted, share back to ${formatBps(agent.repaymentBps)} on ${formatUsdc(debtOf(agent))} USDC outstanding.`;
        }
        if (agent.flagged) {
          return `still flagged: ${formatUsdc(debtOf(agent))} USDC outstanding and the share held at ${formatBps(agent.repaymentBps)} until telemetry holds for a full window.`;
        }
        if (debtOf(agent) === 0n) {
          return `nothing outstanding, ${agent.loansCleared} lines cleared. ${formatUsdc(agent.limit)} USDC stays available at ${formatBps(agent.aprBps)}, and every cent it earns passes through.`;
        }
        return `throughput steady at ${rate} per minute, ${formatUsdc(debtOf(agent))} USDC outstanding on a ${formatUsdc(agent.limit)} USDC line. Terms unchanged.`;
    }
  }

  // ------------------------------------------------------------ choreography

  function protagonistAgent(): SimAgent | null {
    if (!protagonist) return null;
    return economy.byAddress.get(protagonist) ?? null;
  }

  function registerNext(): void {
    let fixture = null as (typeof AGENT_FIXTURES)[number] | null;
    let index = 0;

    if (loop === 0) {
      fixture = AGENT_FIXTURES[PROTAGONIST_FIXTURE]!;
      index = PROTAGONIST_FIXTURE;
    } else if (economy.agents.length < MAX_AGENTS) {
      fixture = LATE_FIXTURES[(loop - 1) % LATE_FIXTURES.length]!;
      index = 20 + economy.agents.length;
    }

    if (!fixture) {
      // Roster is full. The lens moves to whoever has room to borrow instead.
      const idle = economy.agents.find((a) => a.lineStatus === "active" && debtOf(a) === 0n);
      if (idle) protagonist = idle.address;
      return;
    }

    const agent = makeAgent(fixture, index, rng, now, 44);
    agent.scoreReason = "registered, awaiting the first underwriter pass";
    economy.agents.push(agent);
    economy.byAddress.set(agent.address, agent);
    attachBuyers(economy.buyers, agent.address, rng);
    indexBuyers();
    sortRoster(economy);
    protagonist = agent.address;

    hub.emit("register", {
      agent: agent.address,
      router: agent.router,
      label: agent.label,
      service: agent.service,
      erc8004Id: agent.erc8004Id,
      score: 0,
    });
    if (!economy.featuredLocked) economy.featured = agent.address;
    publish(true);
  }

  function burst(count: number, boost: number, forMs: number): void {
    const pool = economy.agents.slice(0, Math.max(1, Math.min(count, economy.agents.length)));
    for (const agent of pool) {
      agent.targetDemandBoost = boost;
      later(forMs, () => {
        agent.targetDemandBoost = 1;
      });
    }
  }

  function runBeat(beat: Beat): void {
    switch (beat.kind) {
      case "deposit":
        moveLiquidity(rng.chance(0.78) ? "in" : "out");
        break;

      case "register":
        registerNext();
        break;

      case "burst": {
        const freed = lastCleared ? economy.byAddress.get(lastCleared) : null;
        if (freed && debtOf(freed) === 0n) {
          // Nothing is being withheld from this one now. Make that visible.
          freed.targetDemandBoost = 2.4;
          later(11_000, () => {
            freed.targetDemandBoost = 1;
          });
        } else {
          burst(3, 2.2, 12_000);
        }
        break;
      }

      case "score": {
        const hero = protagonistAgent();
        if (!hero) break;
        /*
         * First pass opens the line. Any pass after the draw is a raise, because
         * by then the agent has a repayment record and the ladder is the point.
         */
        underwrite(hero, hero.lineStatus === "none" ? undefined : "raised");
        break;
      }

      case "draw": {
        const hero = protagonistAgent();
        if (!hero || hero.lineStatus === "none") break;
        const headroom = hero.limit > debtOf(hero) ? hero.limit - debtOf(hero) : 0n;
        draw(hero, (headroom * 3n) / 10n, DRAW_PURPOSES[rng.int(0, DRAW_PURPOSES.length - 1)]!);
        /*
         * Working capital buys capacity, so the agent starts selling bigger jobs.
         * The extra revenue is what services the loan: this ramp is the product's
         * causal claim, animated. It decays back once the capacity is paid for.
         */
        hero.targetSizeBoost = 6;
        later(46_000, () => {
          hero.targetSizeBoost = 1.8;
        });
        break;
      }

      case "split-focus": {
        // The camera holds on the fork here, so make sure there is one to hold on.
        const hero = protagonistAgent();
        if (hero && hero.pending > 0n) flush(hero);
        const anchor = economy.agents.find((a) => a.repaymentBps === 2000 && debtOf(a) > 0n);
        if (anchor && anchor !== hero) anchor.nextFlushIn = Math.min(anchor.nextFlushIn, 900);
        break;
      }

      case "throttle": {
        /*
         * Reverse order, so the beat picks a mid-book line rather than the anchor
         * borrower, and skip anything inside a few flushes of clearing: that agent
         * has its own beat coming.
         */
        const eligible = economy.agents.filter(
          (a) =>
            a.lineStatus === "active" &&
            !a.flagged &&
            debtOf(a) > 500_000n &&
            a.address !== protagonist,
        );
        const target = eligible[eligible.length - 1];
        if (!target) break;
        target.stallFor = 22_000;
        later(7_000, () => underwrite(target, "throttled"));
        later(34_000, () => underwrite(target));
        break;
      }

      case "clear": {
        // Nudge whoever is inside one flush of clearing, then let it happen.
        for (const agent of economy.agents) {
          const debt = debtOf(agent);
          if (debt === 0n) continue;
          const expected = (agent.pending * BigInt(agent.repaymentBps)) / 10_000n;
          // A keeper prioritizes the account that is about to close.
          if (expected * 2n >= debt) agent.nextFlushIn = Math.min(agent.nextFlushIn, 600);
        }
        break;
      }
    }
  }

  function advanceScript(dt: number): void {
    const previous = phase;
    elapsed += dt;
    loop = Math.floor(elapsed / 1000 / LOOP_SECONDS);
    phase = (elapsed / 1000) % LOOP_SECONDS;
    const wrapped = phase < previous;

    for (const beat of BEATS) {
      const crossed = wrapped
        ? beat.at > previous || beat.at <= phase
        : beat.at > previous && beat.at <= phase;
      if (crossed) runBeat(beat);
    }
  }

  // ------------------------------------------------------------------- clocks

  function accrue(agent: SimAgent, dt: number): void {
    if (agent.principal <= 0n || agent.aprBps <= 0) return;
    const perMs = (Number(agent.principal) * agent.aprBps) / 10_000 / YEAR_MS;
    agent.interestCarry += perMs * dt;
    if (agent.interestCarry >= 1) {
      const whole = Math.floor(agent.interestCarry);
      agent.interestCarry -= whole;
      agent.accruedInterest += BigInt(whole);
      agent.dirty = true;
    }
  }

  function rollBuckets(): void {
    for (const agent of economy.agents) {
      agent.revenueBuckets.shift();
      agent.revenueBuckets.push(0);
      if (agent.paymentTimes.length > 240) {
        agent.paymentTimes = agent.paymentTimes.filter((t) => now - t <= RATE_WINDOW_MS);
      }
      agent.dirty = true;
    }
    economy.assetsBuckets.shift();
    economy.assetsBuckets.push(Number(totalAssetsOf(economy)));
    if (economy.paymentTimes.length > 1_200) {
      economy.paymentTimes = economy.paymentTimes.filter((t) => now - t <= RATE_WINDOW_MS);
    }
    economy.vaultDirty = true;
  }

  function step(dt: number): void {
    now = Date.now();

    for (let i = deferred.length - 1; i >= 0; i--) {
      const item = deferred[i]!;
      item.in -= dt;
      if (item.in <= 0) {
        deferred.splice(i, 1);
        item.run();
      }
    }

    for (const agent of economy.agents) {
      agent.demandBoost = damp(agent.demandBoost, agent.targetDemandBoost, 900, dt);
      agent.sizeBoost = damp(agent.sizeBoost, agent.targetSizeBoost, 1_400, dt);
      accrue(agent, dt);

      if (agent.stallFor > 0) {
        agent.stallFor -= dt;
      } else {
        agent.nextPaymentIn -= dt;
        let guard = 0;
        while (agent.nextPaymentIn <= 0 && guard < 6) {
          payment(agent);
          agent.nextPaymentIn += nextGap(agent.demand, agent.demandBoost, rng);
          guard += 1;
        }
        if (agent.nextPaymentIn <= 0) agent.nextPaymentIn = nextGap(agent.demand, agent.demandBoost, rng);
      }

      agent.nextFlushIn -= dt;
      if (agent.nextFlushIn <= 0) {
        agent.nextFlushIn = rng.int(4_200, 8_400);
        flush(agent);
      }
    }

    nextUnderwriterIn -= dt;
    if (nextUnderwriterIn <= 0) {
      nextUnderwriterIn = rng.int(9_000, 16_000);
      if (economy.agents.length > 0) {
        underwriterCursor = (underwriterCursor + 1) % economy.agents.length;
        const agent = economy.agents[underwriterCursor]!;
        // An unscored protagonist belongs to the script, and no line gets two
        // decisions inside ten seconds: that reads as an indecisive machine.
        const fresh = now - agent.scoredAt < 10_000;
        if (!fresh && (agent.address !== protagonist || agent.lineStatus !== "none")) underwrite(agent);
      }
    }

    nextLiquidityIn -= dt;
    if (nextLiquidityIn <= 0) {
      nextLiquidityIn = rng.int(26_000, 42_000);
      moveLiquidity(rng.chance(0.55) ? "in" : "out");
    }

    if (now >= economy.bucketEdge) {
      economy.bucketEdge += BUCKET_MS;
      if (now >= economy.bucketEdge) economy.bucketEdge = now + BUCKET_MS;
      rollBuckets();
    }

    economy.apyBps = Math.round(damp(economy.apyBps, bookApy(economy), 2_400, dt));

    advanceScript(dt);

    sincePublish += dt;
    publish();
  }

  // --------------------------------------------------------------- lifecycle

  const stream: TributaryStream = {
    mode: "demo",
    get source() {
      return `seed ${options.seed}`;
    },
    get status() {
      return hub.status;
    },
    start() {
      if (running) return;
      running = true;
      now = Date.now();
      economy.apyBps = bookApy(economy);
      hub.setStatus("live");
      publish(true);
    },
    stop() {
      running = false;
      deferred.length = 0;
      hub.dispose();
    },
    tick(dtMs) {
      if (!running) return;
      const budget = Math.min(MAX_STEP_MS, dtMs) * speed;
      if (budget <= 0) return;
      step(budget);
    },
    setFeatured(address) {
      economy.featured = address;
      economy.featuredLocked = address !== null;
      publish(true);
    },
    subscribe: (listener) => hub.subscribe(listener),
    onSnapshot: (listener) => hub.onSnapshot(listener),
    history: (limit) => hub.history(limit),
    snapshot: () => hub.snapshot(),
  };

  return stream;
}
