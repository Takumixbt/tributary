/*
 * The economy's state and its arithmetic. Zone: src/data/**.
 *
 * Everything the dashboard shows is derived here from event math, never from a
 * random walk: share price is assets over shares, utilization is principal over
 * assets, a score is a weighted read of observed revenue and observed debt
 * service. That is what makes demo mode and chain mode interchangeable, and it
 * is also the only way the numbers in two different panels agree with each other.
 *
 * Money stays `Micro` (bigint, 6 decimals) through every reducer. Numbers appear
 * only where the model is genuinely continuous: score inputs, series buckets and
 * the interest accumulator.
 */

import { clamp } from "../../lib/motion";
import type {
  Address,
  AgentHealth,
  AgentState,
  BuyerState,
  LenderState,
  LineStatus,
  Micro,
  Series,
  StreamMode,
  StreamSnapshot,
  StreamStats,
  StreamStatus,
  VaultState,
} from "../../lib/types";
import { AGENT_FIXTURES, BUYER_LABELS, LENDER_LABELS, fakeAddress, type AgentFixture } from "./fixtures";
import type { Rng } from "./prng";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MICRO = 1_000_000n;
export const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
export const BUCKET_MS = 5_000;
export const BUCKETS = 48;
/** Rolling window behind every "per minute" reading on the page. */
export const RATE_WINDOW_MS = 60_000;
/** Full sparkline window. */
export const TRAIL_MS = BUCKET_MS * BUCKETS;
/** Buckets behind the underwriter's revenue rate: one minute. */
export const RATE_BUCKETS = 12;

/**
 * Concentration cap. No single borrower may hold a line worth more than this
 * share of the book, however good its score is. A lending protocol without a
 * concentration limit is one bad agent away from a total loss.
 */
export const CONCENTRATION_BPS = 2500;

/**
 * Fixture demand is stated at full tilt. Running it flat out puts 10 events a
 * second on the tape, which stops reading as a ledger and starts reading as
 * noise, so the whole economy runs at this fraction of nameplate.
 */
export const TRAFFIC_SCALE = 0.6;

/** Chance a buyer orders a batch instead of a single call. */
const BULK_CHANCE = 0.04;
/** Expected amount multiple over unit price, given the two order shapes. */
export const MEAN_MULT = 2.25;

const DELINQUENT_PENALTY = 170;
const THROTTLE_PENALTY = 90;

// ---------------------------------------------------------------------------
// Mutable state
// ---------------------------------------------------------------------------

export interface SimAgent {
  address: Address;
  router: Address;
  label: string;
  service: string;
  unitPrice: Micro;
  erc8004Id: number;
  /** Calls per minute at nameplate, before TRAFFIC_SCALE and the boosts. */
  demand: number;

  score: number;
  previousScore: number;
  scoredAt: number;
  scoreReason: string;

  revenueTotal: Micro;
  repaidTotal: Micro;
  drawnTotal: Micro;

  principal: Micro;
  accruedInterest: Micro;
  /** Sub-micro interest carry. Interest per frame is a fraction of one unit. */
  interestCarry: number;
  limit: Micro;
  aprBps: number;
  repaymentBps: number;
  /**
   * The share the line was written at. Throttling raises `repaymentBps` above
   * this; recovery restores it. Without the pair, an un-throttle would silently
   * re-price a live loan.
   */
  baseRepaymentBps: number;
  lineStatus: LineStatus;
  /** Set by the underwriter when router telemetry stops matching inflows. */
  flagged: boolean;
  flaggedAt: number;
  loansCleared: number;
  loanOpenedAt: number;
  splitsSinceDraw: number;
  repaidSinceDraw: Micro;

  paymentsTotal: number;
  lastPaymentAt: number;
  paymentTimes: number[];
  revenueBuckets: number[];

  /** Gross revenue sitting in the router, waiting for the next keeper flush. */
  pending: Micro;
  nextPaymentIn: number;
  nextFlushIn: number;

  /** Demand surge multiplier, damped toward its target. */
  demandBoost: number;
  targetDemandBoost: number;
  /** Order-size surge multiplier: the agent is selling bigger jobs. */
  sizeBoost: number;
  targetSizeBoost: number;
  /** Sim time left with no inflows at all. Drives the throttle beat. */
  stallFor: number;

  registeredAt: number;
  /** When revenue first became observable. Prior x402 history counts. */
  observedFrom: number;

  dirty: boolean;
  cache: AgentState | null;
}

export interface SimBuyer {
  address: Address;
  label: string;
  buysFrom: Address[];
  paymentsTotal: number;
  spendTotal: Micro;
  lastPaymentAt: number;
}

export interface SimLender {
  address: Address;
  label: string;
  shares: bigint;
  depositedAt: number;
}

export interface Economy {
  vaultAddress: Address;
  /** Idle USDC held by the vault: what can be drawn or withdrawn right now. */
  idle: Micro;
  shares: bigint;
  interestEarned: Micro;
  drawnTotal: Micro;
  repaidTotal: Micro;
  assetsBuckets: number[];

  agents: SimAgent[];
  byAddress: Map<Address, SimAgent>;
  buyers: SimBuyer[];
  lenders: SimLender[];

  paymentsTotal: number;
  volumeTotal: Micro;
  splitsTotal: number;
  routedToVault: Micro;
  smallestPayment: Micro;
  paymentTimes: number[];

  apyBps: number;

  startedAt: number;
  bucketEdge: number;

  featured: Address | null;
  /** True once a human picked an agent. The script stops moving the lens. */
  featuredLocked: boolean;

  vaultDirty: boolean;
  rosterDirty: boolean;
  peopleDirty: boolean;

  vaultCache: VaultState | null;
  agentsCache: AgentState[] | null;
  buyersCache: BuyerState[] | null;
  lendersCache: LenderState[] | null;
}

// ---------------------------------------------------------------------------
// The cast that joins after the opening roster
// ---------------------------------------------------------------------------

/**
 * Agents that register during later loops, so the economy visibly grows across
 * a long demo instead of replaying the same five names.
 */
export const LATE_FIXTURES: AgentFixture[] = [
  { label: "PROBE-12", service: "liquidity probes", unitPrice: 2_500n, demand: 120, erc8004Id: 8112 },
  { label: "LEXER-08", service: "policy checks", unitPrice: 6_000n, demand: 74, erc8004Id: 8138 },
  { label: "BEACON-05", service: "price attestations", unitPrice: 900n, demand: 210, erc8004Id: 8165 },
  { label: "WARDEN-06", service: "key rotations", unitPrice: 45_000n, demand: 18, erc8004Id: 8171 },
];

// ---------------------------------------------------------------------------
// Opening book
// ---------------------------------------------------------------------------

/**
 * The roster a cold load starts from. Chain mode reads this from contracts; demo
 * mode states it, because a lending terminal with an empty loan book tells you
 * nothing about a lending protocol. Every figure below is internally consistent:
 * lifetime debt service equals drawn minus outstanding principal plus interest
 * paid, and the vault's share price is assets over shares.
 *
 * Accrued interest is deliberately tiny. A rail that flushes every few seconds
 * pays interest before principal on every flush, so interest never gets the
 * chance to pile up. These figures are one keeper gap of accrual, not one loan's
 * worth.
 */
interface Preseed {
  fixture: number;
  limit: Micro;
  principal: Micro;
  accrued: Micro;
  aprBps: number;
  repaymentBps: number;
  lineStatus: LineStatus;
  flagged: boolean;
  drawn: Micro;
  repaid: Micro;
  loansCleared: number;
  splitsSinceDraw: number;
  /** Hours of loan age, for the accrual figure to make sense. */
  loanAgeH: number;
  /** Hours of observable revenue history before this session. */
  historyH: number;
  reason: string;
}

const PRESEED: Preseed[] = [
  {
    fixture: 0, // ORACLE-01: the anchor borrower. Its 20/80 split is the hero fork.
    limit: 102_400_000n,
    principal: 74_800_000n,
    accrued: 427n,
    aprBps: 1500,
    repaymentBps: 2000,
    lineStatus: "active",
    flagged: false,
    drawn: 343_700_000n,
    repaid: 269_100_000n,
    loansCleared: 9,
    splitsSinceDraw: 486,
    loanAgeH: 40,
    historyH: 61,
    reason: "9 lines cleared, 100% debt service, revenue 68.04 USDC per hour",
  },
  {
    fixture: 1, // SCRIBE-04: healthy, and the agent the throttle beat picks on.
    limit: 84_000_000n,
    principal: 28_400_000n,
    accrued: 194n,
    aprBps: 1800,
    repaymentBps: 2500,
    lineStatus: "active",
    flagged: false,
    drawn: 168_000_000n,
    repaid: 139_690_000n,
    loansCleared: 6,
    splitsSinceDraw: 212,
    loanAgeH: 22,
    historyH: 48,
    reason: "6 lines cleared, no missed splits in 22 hours, terms unchanged",
  },
  {
    fixture: 3, // ATLAS-02: throttled, and down to its final tranche.
    limit: 28_400_000n,
    principal: 62_000n,
    accrued: 1n,
    aprBps: 2100,
    repaymentBps: 3000,
    lineStatus: "throttled",
    flagged: false,
    drawn: 58_600_000n,
    repaid: 58_610_400n,
    loansCleared: 2,
    splitsSinceDraw: 214,
    loanAgeH: 6,
    historyH: 33,
    reason: "inflows dipped 38% against router telemetry, share raised to 30%",
  },
  {
    fixture: 4, // VERSE-09: flagged. The delinquent form has to exist on load.
    limit: 44_000_000n,
    principal: 7_900_000n,
    accrued: 72n,
    aprBps: 2400,
    repaymentBps: 3000,
    lineStatus: "active",
    flagged: true,
    drawn: 39_400_000n,
    repaid: 31_540_000n,
    loansCleared: 3,
    splitsSinceDraw: 96,
    loanAgeH: 30,
    historyH: 40,
    reason: "router telemetry has not matched Gateway inflows for 3 flushes",
  },
];

/** SENTRY-07 is held back: it registers on the beat and carries the story. */
export const PROTAGONIST_FIXTURE = 2;

const VAULT_ASSETS_OPEN = 412_400_000n; // 412.40 USDC
const VAULT_INTEREST_OPEN = 380_000n;
const VAULT_DRAWN_OPEN = 609_700_000n;
const VAULT_REPAID_OPEN = 498_940_000n;
const LENDER_SPLIT = [0.42, 0.27, 0.19, 0.12];

export function createEconomy(rng: Rng, now: number): Economy {
  const vaultAddress = fakeAddress("vault", 0);
  const agents: SimAgent[] = [];
  const byAddress = new Map<Address, SimAgent>();

  for (const seed of PRESEED) {
    const agent = makeAgent(AGENT_FIXTURES[seed.fixture]!, seed.fixture, rng, now, seed.historyH);
    agent.limit = seed.limit;
    agent.principal = seed.principal;
    agent.accruedInterest = seed.accrued;
    agent.aprBps = seed.aprBps;
    agent.repaymentBps = seed.repaymentBps;
    agent.baseRepaymentBps = seed.lineStatus === "throttled" ? seed.repaymentBps - 1000 : seed.repaymentBps;
    agent.lineStatus = seed.lineStatus;
    agent.flagged = seed.flagged;
    agent.flaggedAt = seed.flagged ? now - 5_000 : 0;
    agent.drawnTotal = seed.drawn;
    agent.repaidTotal = seed.repaid;
    agent.loansCleared = seed.loansCleared;
    agent.splitsSinceDraw = seed.splitsSinceDraw;
    agent.repaidSinceDraw = seed.repaid;
    agent.loanOpenedAt = now - seed.loanAgeH * 3_600_000;
    agent.scoreReason = seed.reason;
    agent.scoredAt = now - rng.int(90, 600) * 1000;
    agent.score = scoreOf(agent, now);
    agent.previousScore = agent.score;
    agents.push(agent);
    byAddress.set(agent.address, agent);
  }

  const buyers: SimBuyer[] = BUYER_LABELS.map((label, i) => ({
    address: fakeAddress("buyer", i),
    label,
    buysFrom: [],
    paymentsTotal: rng.int(1_800, 24_000),
    spendTotal: BigInt(rng.int(4_000_000, 260_000_000)),
    lastPaymentAt: now - rng.int(1, 40) * 1000,
  }));

  for (const agent of agents) attachBuyers(buyers, agent.address, rng);

  const principal = agents.reduce((sum, a) => sum + a.principal, 0n);
  const idle = VAULT_ASSETS_OPEN - principal;
  const shares = VAULT_ASSETS_OPEN - VAULT_INTEREST_OPEN;

  const lenders: SimLender[] = LENDER_LABELS.map((label, i) => ({
    address: fakeAddress("lender", i),
    label,
    shares: (shares * BigInt(Math.round(LENDER_SPLIT[i]! * 10_000))) / 10_000n,
    depositedAt: now - rng.int(4, 72) * 3_600_000,
  }));
  // Rounding remainder lands on the largest position, so shares reconcile.
  const assigned = lenders.reduce((sum, l) => sum + l.shares, 0n);
  lenders[0]!.shares += shares - assigned;

  const assetsFloor = Number(VAULT_ASSETS_OPEN) * 0.94;
  const assetsBuckets = new Array<number>(BUCKETS)
    .fill(0)
    .map((_, i) =>
      Math.round(
        assetsFloor + (Number(VAULT_ASSETS_OPEN) - assetsFloor) * (i / (BUCKETS - 1)) + rng.range(-1, 1) * 90_000,
      ),
    );
  assetsBuckets[BUCKETS - 1] = Number(VAULT_ASSETS_OPEN);

  const economy: Economy = {
    vaultAddress,
    idle,
    shares,
    interestEarned: VAULT_INTEREST_OPEN,
    drawnTotal: VAULT_DRAWN_OPEN,
    repaidTotal: VAULT_REPAID_OPEN,
    assetsBuckets,
    agents,
    byAddress,
    buyers,
    lenders,
    paymentsTotal: 0,
    volumeTotal: 0n,
    splitsTotal: 0,
    routedToVault: 0n,
    smallestPayment: 0n,
    paymentTimes: [],
    apyBps: 0,
    startedAt: now,
    bucketEdge: now + BUCKET_MS,
    featured: null,
    featuredLocked: false,
    vaultDirty: true,
    rosterDirty: true,
    peopleDirty: true,
    vaultCache: null,
    agentsCache: null,
    buyersCache: null,
    lendersCache: null,
  };

  economy.apyBps = bookApy(economy);
  sortRoster(economy);
  economy.featured = agents[0]?.address ?? null;
  return economy;
}

export function makeAgent(
  fixture: AgentFixture,
  index: number,
  rng: Rng,
  now: number,
  historyHours: number,
): SimAgent {
  const address = fakeAddress("agent", index);
  const perMin = revenuePerMinuteOf(fixture.unitPrice, fixture.demand, 1);
  const perBucket = (perMin * BUCKET_MS) / 60_000;
  /*
   * An agent arrives with x402 history: it was already selling before it asked
   * for credit, which is the whole reason there is anything to underwrite.
   */
  const payments = Math.round(fixture.demand * TRAFFIC_SCALE * 60 * historyHours);
  const revenue = BigInt(Math.round(Number(fixture.unitPrice) * MEAN_MULT * payments));

  return {
    address,
    router: fakeAddress("router", index),
    label: fixture.label,
    service: fixture.service,
    unitPrice: fixture.unitPrice,
    erc8004Id: fixture.erc8004Id,
    demand: fixture.demand,
    score: 0,
    previousScore: 0,
    scoredAt: 0,
    scoreReason: "",
    revenueTotal: revenue,
    repaidTotal: 0n,
    drawnTotal: 0n,
    principal: 0n,
    accruedInterest: 0n,
    interestCarry: 0,
    limit: 0n,
    aprBps: 0,
    repaymentBps: 0,
    baseRepaymentBps: 0,
    lineStatus: "none",
    flagged: false,
    flaggedAt: 0,
    loansCleared: 0,
    loanOpenedAt: 0,
    splitsSinceDraw: 0,
    repaidSinceDraw: 0n,
    paymentsTotal: payments,
    lastPaymentAt: now - rng.int(1, 8) * 1000,
    paymentTimes: seedPaymentTimes(fixture, rng, now),
    revenueBuckets: new Array<number>(BUCKETS)
      .fill(0)
      .map(() => Math.max(0, Math.round(perBucket * rng.range(0.55, 1.5)))),
    pending: BigInt(Math.round(perBucket * rng.range(0.4, 2.4))),
    nextPaymentIn: nextGap(fixture.demand, 1, rng),
    nextFlushIn: rng.int(1_200, 6_800),
    demandBoost: 1,
    targetDemandBoost: 1,
    sizeBoost: 1,
    targetSizeBoost: 1,
    stallFor: 0,
    registeredAt: now,
    observedFrom: now - historyHours * 3_600_000,
    dirty: true,
    cache: null,
  };
}

/** A minute of plausible arrival times, so payments per minute is live at t=0. */
function seedPaymentTimes(fixture: AgentFixture, rng: Rng, now: number): number[] {
  const rate = (fixture.demand * TRAFFIC_SCALE) / 60_000;
  const times: number[] = [];
  let t = now - RATE_WINDOW_MS;
  while (t < now) {
    t += -Math.log(1 - rng.next()) / rate;
    if (t < now) times.push(Math.round(t));
  }
  return times;
}

export function attachBuyers(buyers: SimBuyer[], agent: Address, rng: Rng): void {
  const count = Math.min(buyers.length, rng.int(3, 5));
  const picked = new Set<number>();
  while (picked.size < count) picked.add(rng.int(0, buyers.length - 1));
  for (const i of picked) {
    const buyer = buyers[i]!;
    if (!buyer.buysFrom.includes(agent)) buyer.buysFrom = [...buyer.buysFrom, agent];
  }
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

export function debtOf(agent: SimAgent): Micro {
  return agent.principal + agent.accruedInterest;
}

export function totalPrincipalOf(economy: Economy): Micro {
  let sum = 0n;
  for (const agent of economy.agents) sum += agent.principal;
  return sum;
}

export function totalAssetsOf(economy: Economy): Micro {
  return economy.idle + totalPrincipalOf(economy);
}

export function sharePriceOf(economy: Economy): Micro {
  if (economy.shares <= 0n) return MICRO;
  return (totalAssetsOf(economy) * MICRO) / economy.shares;
}

export function healthOf(agent: SimAgent): AgentHealth {
  if (agent.flagged || agent.lineStatus === "written-off") return "delinquent";
  if (agent.lineStatus === "throttled") return "throttled";
  return "healthy";
}

/** Expected gross revenue per minute in micro-USDC, at the given size boost. */
export function revenuePerMinuteOf(unitPrice: Micro, demand: number, sizeBoost: number): number {
  return demand * TRAFFIC_SCALE * Number(unitPrice) * MEAN_MULT * sizeBoost;
}

/** Sim-time gap to the next payment, exponential so traffic reads as bursty. */
export function nextGap(demand: number, boost: number, rng: Rng): number {
  const perMin = Math.max(1, demand * TRAFFIC_SCALE * boost);
  const mean = 60_000 / perMin;
  return -mean * Math.log(1 - rng.next());
}

/** One order's amount. Mostly a single call, occasionally a batch. */
export function orderAmount(agent: SimAgent, rng: Rng): Micro {
  const mult = rng.chance(BULK_CHANCE) ? rng.logRange(6, 25) : rng.logRange(0.6, 4);
  const raw = Number(agent.unitPrice) * mult * agent.sizeBoost;
  return BigInt(Math.max(1, Math.round(raw)));
}

export function ratePerMinute(times: number[], now: number): number {
  let count = 0;
  for (let i = times.length - 1; i >= 0; i--) {
    if (now - times[i]! > RATE_WINDOW_MS) break;
    count += 1;
  }
  return count;
}

export function trailingRevenue(agent: SimAgent): number {
  let sum = 0;
  for (const v of agent.revenueBuckets) sum += v;
  return sum;
}

/**
 * Trailing revenue as USDC per hour: the rate every limit is priced against.
 * Twelve complete buckets, one minute, excluding the bucket still filling. A
 * longer window would price a limit off revenue the agent no longer earns.
 */
export function revenuePerHour(agent: SimAgent): number {
  const end = agent.revenueBuckets.length - 1;
  const start = Math.max(0, end - RATE_BUCKETS);
  let sum = 0;
  for (let i = start; i < end; i++) sum += agent.revenueBuckets[i]!;
  const spanMs = Math.max(BUCKET_MS, (end - start) * BUCKET_MS);
  return (sum / 1e6) * (3_600_000 / spanMs);
}

// ---------------------------------------------------------------------------
// The underwriter's model
// ---------------------------------------------------------------------------

const W = { volume: 0.22, cadence: 0.12, service: 0.34, history: 0.12, tenure: 0.12, identity: 0.08 };
const VOLUME_CEIL = Math.log10(301);
const CADENCE_CEIL = Math.log(151);

/**
 * The score, 0-1000, as a weighted read of what is observable on chain: how much
 * revenue the router has seen, how steadily it arrives, how much of what was
 * drawn came back, how long the history is, and whether an ERC-8004 identity is
 * attached to it. Debt service is the heaviest term on purpose: an agent with no
 * repayment record cannot reach the top band however much it earns.
 */
export function scoreOf(agent: SimAgent, now: number): number {
  const volume = clamp(Math.log10(1 + revenuePerHour(agent)) / VOLUME_CEIL, 0, 1);
  const cadence = clamp(Math.log(1 + ratePerMinute(agent.paymentTimes, now)) / CADENCE_CEIL, 0, 1);

  const drawn = Number(agent.drawnTotal) / 1e6;
  const repaid = Number(agent.repaidTotal) / 1e6;
  const proof = clamp(0.35 + 0.65 * Math.min(1, agent.loansCleared / 3), 0, 1);
  const service = drawn > 0 ? clamp(repaid / (drawn * 1.05), 0, 1) * proof : 0;

  const history = clamp(agent.paymentsTotal / 60_000, 0, 1);
  const tenure = clamp((now - agent.observedFrom) / (6 * 3_600_000), 0, 1);
  const identity = agent.erc8004Id > 0 ? 1 : 0;

  const raw =
    W.volume * volume +
    W.cadence * cadence +
    W.service * service +
    W.history * history +
    W.tenure * tenure +
    W.identity * identity;

  let score = Math.round(raw * 1000);
  if (agent.flagged) score -= DELINQUENT_PENALTY;
  if (agent.lineStatus === "throttled") score -= THROTTLE_PENALTY;
  return Math.round(clamp(score, 0, 1000));
}

/** The underwriter ratchets. A single clean loan is not a new credit history. */
export function postedScore(previous: number, model: number): number {
  if (previous <= 0) return model;
  return Math.round(clamp(previous + clamp(model - previous, -120, 90), 0, 1000));
}

/**
 * Limits are priced in hours of observed revenue, never in a fixed tier, then
 * capped by the book's concentration limit.
 */
export function limitFor(agent: SimAgent, score: number, assets: Micro): Micro {
  const hours = 0.5 + 3.5 * (score / 1000);
  const usdc = revenuePerHour(agent) * hours;
  const priced = BigInt(Math.round(usdc * 100)) * 10_000n; // two decimals
  const cap = ((assets * BigInt(CONCENTRATION_BPS)) / 10_000n / 10_000n) * 10_000n;
  return priced < cap ? priced : cap;
}

export function aprFor(score: number): number {
  return Math.round((2600 - 1400 * (score / 1000)) / 50) * 50;
}

/**
 * The repayment share. Quantized, because it is a number a human reads off a
 * panel: 30, 20, 15 and 10 percent are the only shares this product uses.
 */
export function shareFor(score: number): number {
  if (score < 300) return 3000;
  if (score < 560) return 2000;
  if (score < 760) return 1500;
  return 1000;
}

/**
 * Lender yield at the book's current terms: principal-weighted APR over total
 * assets. This is the number a lending market quotes, and it is the only honest
 * one at this scale. Interest actually received in any sixty-second window is a
 * few micro units, and annualizing that would print a wild figure that says
 * nothing about the book.
 */
export function bookApy(economy: Economy): number {
  const assets = Number(totalAssetsOf(economy));
  if (assets <= 0) return 0;
  let weighted = 0;
  for (const agent of economy.agents) weighted += Number(agent.principal) * agent.aprBps;
  return Math.round(clamp(weighted / assets, 0, 6000));
}

export function sortRoster(economy: Economy): void {
  economy.agents.sort((a, b) => b.score - a.score || Number(b.revenueTotal - a.revenueTotal));
  economy.rosterDirty = true;
}

// ---------------------------------------------------------------------------
// Snapshot derivation
// ---------------------------------------------------------------------------

function series(values: number[]): Series {
  return { bucketMs: BUCKET_MS, values: values.slice() };
}

function agentStateOf(agent: SimAgent, now: number): AgentState {
  return {
    address: agent.address,
    router: agent.router,
    label: agent.label,
    service: agent.service,
    unitPrice: agent.unitPrice,
    erc8004Id: agent.erc8004Id,
    score: agent.score,
    scoredAt: agent.scoredAt,
    scoreReason: agent.scoreReason,
    revenueTotal: agent.revenueTotal,
    revenue24h: BigInt(Math.round(trailingRevenue(agent))),
    repaidTotal: agent.repaidTotal,
    debt: debtOf(agent),
    principal: agent.principal,
    accruedInterest: agent.accruedInterest,
    limit: agent.limit,
    aprBps: agent.aprBps,
    repaymentBps: agent.repaymentBps,
    lineStatus: agent.lineStatus,
    health: healthOf(agent),
    paymentsTotal: agent.paymentsTotal,
    paymentsPerMin: ratePerMinute(agent.paymentTimes, now),
    lastPaymentAt: agent.lastPaymentAt,
    revenueSeries: series(agent.revenueBuckets),
  };
}

function vaultStateOf(economy: Economy, now: number): VaultState {
  const principal = totalPrincipalOf(economy);
  const assets = economy.idle + principal;
  const utilization = assets > 0n ? Number((principal * 10_000n) / assets) : 0;
  return {
    address: economy.vaultAddress,
    totalAssets: assets,
    availableLiquidity: economy.idle,
    totalPrincipal: principal,
    totalShares: economy.shares,
    sharePrice: economy.shares > 0n ? (assets * MICRO) / economy.shares : MICRO,
    utilizationBps: utilization,
    apyBps: economy.apyBps,
    interestEarned: economy.interestEarned,
    drawnTotal: economy.drawnTotal,
    repaidTotal: economy.repaidTotal,
    lenderCount: economy.lenders.length,
    agentsFunded: economy.agents.filter((a) => a.lineStatus !== "none").length,
    assetsSeries: series(economy.assetsBuckets),
    updatedAt: now,
  };
}

function statsOf(economy: Economy, now: number): StreamStats {
  let scored = 0;
  let total = 0;
  let active = 0;
  for (const agent of economy.agents) {
    if (agent.score > 0) {
      scored += 1;
      total += agent.score;
    }
    if (now - agent.lastPaymentAt < 120_000) active += 1;
  }
  return {
    paymentsPerMin: ratePerMinute(economy.paymentTimes, now),
    paymentsTotal: economy.paymentsTotal,
    volumeTotal: economy.volumeTotal,
    splitsTotal: economy.splitsTotal,
    routedToVault: economy.routedToVault,
    activeAgents: active,
    avgScore: scored > 0 ? Math.round(total / scored) : 0,
    smallestPayment: economy.smallestPayment,
    uptimeMs: now - economy.startedAt,
  };
}

/**
 * Build the public snapshot, reusing every slice that did not change. Object
 * identity is the render budget: the roster only re-renders the rows whose agent
 * moved, and the vault panel holds still between money movements.
 */
export function deriveSnapshot(
  economy: Economy,
  now: number,
  mode: StreamMode,
  status: StreamStatus,
  note?: string,
): StreamSnapshot {
  if (economy.vaultDirty || !economy.vaultCache) {
    economy.vaultCache = vaultStateOf(economy, now);
    economy.vaultDirty = false;
  }

  let rosterChanged = economy.rosterDirty || !economy.agentsCache;
  for (const agent of economy.agents) {
    if (agent.dirty || !agent.cache) {
      agent.cache = agentStateOf(agent, now);
      agent.dirty = false;
      rosterChanged = true;
    }
  }
  if (rosterChanged) {
    economy.agentsCache = economy.agents.map((agent) => agent.cache!);
    economy.rosterDirty = false;
  }

  if (economy.peopleDirty || !economy.buyersCache || !economy.lendersCache) {
    economy.buyersCache = economy.buyers.map((buyer) => ({
      address: buyer.address,
      label: buyer.label,
      buysFrom: buyer.buysFrom,
      paymentsTotal: buyer.paymentsTotal,
      spendTotal: buyer.spendTotal,
      lastPaymentAt: buyer.lastPaymentAt,
    }));
    const price = sharePriceOf(economy);
    economy.lendersCache = economy.lenders.map((lender) => ({
      address: lender.address,
      label: lender.label,
      shares: lender.shares,
      value: (lender.shares * price) / MICRO,
      depositedAt: lender.depositedAt,
    }));
    economy.peopleDirty = false;
  }

  return {
    at: now,
    mode,
    status,
    vault: economy.vaultCache,
    agents: economy.agentsCache!,
    buyers: economy.buyersCache,
    lenders: economy.lendersCache,
    stats: statsOf(economy, now),
    featuredAgent: economy.featured,
    ...(note ? { note } : {}),
  };
}
