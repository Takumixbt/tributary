/*
 * ============================================================================
 * THE CONTRACT
 * ============================================================================
 * Every zone of this app talks through the types in this file. The demo
 * simulator and the chain reader both produce exactly these shapes, so the
 * graph, the kinetic primitives and the dashboard never know or care which
 * mode they are running in.
 *
 * src/lib/** is FROZEN. It is owned by the design lead. If you believe a type
 * is missing, widen it locally inside your own zone instead of editing here.
 *
 * MONEY RULE
 * ----------
 * Every USDC amount in this file is `Micro`: a bigint of 6-decimal base units.
 * 1 USDC === 1_000_000n. Never a float, never pre-divided, never a string.
 * Convert at the edge of rendering with lib/format.ts.
 *
 * TIME RULE
 * ---------
 * Every timestamp is `at`: milliseconds since epoch, as a number. Chain mode
 * converts block seconds to ms before emitting.
 * ============================================================================
 */

export type Hex = `0x${string}`;
export type Address = Hex;

/** 6-decimal USDC base units. 1_000_000n === 1 USDC. */
export type Micro = bigint;

/** Basis points. 2000 === 20%. */
export type Bps = number;

/** Milliseconds since epoch. */
export type Millis = number;

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/** Where an actor sits in the money's circuit. Drives node silhouette. */
export type NodeRole = "buyer" | "agent" | "router" | "vault" | "lender" | "underwriter";

export type StreamMode = "demo" | "chain";

/**
 * idle    : constructed, not started
 * live    : events arriving
 * stalled : started but nothing for > 15s (chain mode RPC trouble, or a
 *           deliberate quiet stretch in the demo script)
 * error   : unrecoverable; the UI shows the reason and stays on screen
 */
export type StreamStatus = "idle" | "live" | "stalled" | "error";

/** Credit line lifecycle, mirroring TributaryVault.CreditLine. */
export type LineStatus = "none" | "active" | "throttled" | "closed" | "written-off";

/**
 * Credit health, the one piece of derived state the graph renders as a visual
 * grammar: healthy = solid edges, throttled = dashed edges plus node jitter,
 * delinquent = outline-only node with a slow blink.
 */
export type AgentHealth = "healthy" | "throttled" | "delinquent";

/** What the underwriter did on its last pass over this agent. */
export type UnderwriterAction = "opened" | "raised" | "held" | "throttled" | "closed";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface EventBase {
  /** Stable unique id. Use as the React key. Never reused. */
  id: string;
  /** Monotonic per stream, starting at 1. Ordering is by seq, not by `at`. */
  seq: number;
  /** Milliseconds since epoch. */
  at: Millis;
  /** True when produced by the demo simulator. Drives the SIMULATION marker. */
  simulated: boolean;
  /** Present in chain mode only. */
  txHash?: Hex;
  /** Present in chain mode only. */
  blockNumber?: bigint;
}

/**
 * One x402 nanopayment landing for a selling agent. This is the atom of the
 * whole product: thousands of these per hour, most of them sub-cent.
 * Graph: spawns a pulse on the buyer -> agent edge.
 */
export interface PaymentEvent extends EventBase {
  kind: "payment";
  buyer: Address;
  /** Short human label for the buyer, e.g. "RESEARCH-04". Never an address. */
  buyerLabel: string;
  agent: Address;
  router: Address;
  amount: Micro;
  /** What was sold, e.g. "risk report". Lowercase, no trailing period. */
  service: string;
}

/**
 * One RevenueRouter.flush(): the split moment. `total = toVault + toAgent`.
 * Graph: the pulse reaching the router forks into two pulses whose radii are
 * proportional to toVault and toAgent. This is the demo's money shot.
 */
export interface SplitEvent extends EventBase {
  kind: "split";
  agent: Address;
  router: Address;
  total: Micro;
  toVault: Micro;
  toAgent: Micro;
  /** The split ratio in force at flush time, from the vault's line. */
  repaymentBps: Bps;
  /** Debt remaining after this split. 0n fires a ClearedEvent next. */
  debtAfter: Micro;
}

/**
 * An underwriter decision. Always carries a reason string: the underwriter
 * feed is a feed of sentences, not of numbers.
 */
export interface ScoreEvent extends EventBase {
  kind: "score";
  agent: Address;
  /** 0-1000. */
  score: number;
  previousScore: number;
  /**
   * Human-readable justification built from live signals, e.g.
   * "revenue 41.20 USDC over 6h, 100% debt service, zero missed splits".
   */
  reason: string;
  limit: Micro;
  previousLimit: Micro;
  aprBps: Bps;
  action: UnderwriterAction;
}

/** Agent pulls working capital against its line. */
export interface DrawEvent extends EventBase {
  kind: "draw";
  agent: Address;
  amount: Micro;
  principalAfter: Micro;
  /** Why the agent needed capital, e.g. "inference credits". */
  purpose: string;
}

/** Vault-side view of a repayment. Emitted alongside the SplitEvent. */
export interface RepayEvent extends EventBase {
  kind: "repay";
  agent: Address;
  /** The router, normally. Anyone may repay on an agent's behalf. */
  payer: Address;
  interestPaid: Micro;
  principalPaid: Micro;
  debtAfter: Micro;
}

/** Lender liquidity moving in or out of the vault. */
export interface DepositEvent extends EventBase {
  kind: "deposit";
  lender: Address;
  lenderLabel: string;
  assets: Micro;
  shares: bigint;
  direction: "in" | "out";
}

/** A new agent joins the economy. Graph: a node fades in on the left. */
export interface RegisterEvent extends EventBase {
  kind: "register";
  agent: Address;
  router: Address;
  label: string;
  service: string;
  /** ERC-8004 identity token id. 0 when the agent has no identity yet. */
  erc8004Id: number;
  score: number;
}

/**
 * Debt fully repaid. Graph: a single expanding 1px ring wave from the router.
 * Rare, high signal, gets the glyph-settle treatment in the UI.
 */
export interface ClearedEvent extends EventBase {
  kind: "cleared";
  agent: Address;
  router: Address;
  /** Lifetime debt service that closed this loan. */
  totalRepaid: Micro;
  /** How many splits it took. */
  splitsToClear: number;
  /** Wall-clock duration of the loan. */
  durationMs: number;
}

export type TributaryEvent =
  | PaymentEvent
  | SplitEvent
  | ScoreEvent
  | DrawEvent
  | RepayEvent
  | DepositEvent
  | RegisterEvent
  | ClearedEvent;

export type EventKind = TributaryEvent["kind"];

/** Narrow a union member by kind: `if (isKind(e, "split"))`. */
export function isKind<K extends EventKind>(
  event: TributaryEvent,
  kind: K,
): event is Extract<TributaryEvent, { kind: K }> {
  return event.kind === kind;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * A short time series for sparklines. Values are micro-USDC expressed as JS
 * numbers (safe: a bucket never approaches 2^53) so charting math stays cheap.
 * `values[values.length - 1]` is the newest bucket and may still be filling.
 */
export interface Series {
  /** Width of one bucket in ms. */
  bucketMs: number;
  /** Oldest first. Fixed length per producer; pad with 0, never with holes. */
  values: number[];
}

export interface VaultState {
  address: Address;
  /** Idle USDC plus outstanding principal. */
  totalAssets: Micro;
  /** Idle USDC only: what can be drawn or withdrawn right now. */
  availableLiquidity: Micro;
  /** Sum of outstanding principal across all lines. */
  totalPrincipal: Micro;
  totalShares: bigint;
  /** Assets per 1e6 shares, in micro-USDC. 1_000_000n means par. */
  sharePrice: Micro;
  /** totalPrincipal / totalAssets. */
  utilizationBps: Bps;
  /** Trailing realized lender yield, annualized. */
  apyBps: Bps;
  /** Interest actually paid to the vault, lifetime. */
  interestEarned: Micro;
  drawnTotal: Micro;
  repaidTotal: Micro;
  lenderCount: number;
  agentsFunded: number;
  /** Total assets over time, for the vault panel sparkline. */
  assetsSeries: Series;
  updatedAt: Millis;
}

export interface AgentState {
  address: Address;
  router: Address;
  /** Short uppercase handle, e.g. "ORACLE-01". Used everywhere a name is shown. */
  label: string;
  /** What it sells, e.g. "token risk reports". Lowercase. */
  service: string;
  /** Unit price of one call, for the roster. */
  unitPrice: Micro;
  erc8004Id: number;

  /** 0-1000, as posted by the underwriter. */
  score: number;
  scoredAt: Millis;
  scoreReason: string;

  /** Lifetime gross revenue routed, from RevenueRouter.cumulativeRevenue. */
  revenueTotal: Micro;
  /** Trailing 24h revenue. Demo mode compresses 24h into the session. */
  revenue24h: Micro;
  /** Lifetime debt service, from RevenueRouter.cumulativeRepaid. */
  repaidTotal: Micro;

  /** principal + accruedInterest. The number the hatch bar drains. */
  debt: Micro;
  principal: Micro;
  accruedInterest: Micro;
  limit: Micro;
  aprBps: Bps;
  repaymentBps: Bps;
  lineStatus: LineStatus;
  health: AgentHealth;

  paymentsTotal: number;
  /** Rolling rate over the last 60s. May be fractional. */
  paymentsPerMin: number;
  lastPaymentAt: Millis;
  revenueSeries: Series;
}

/** Buyer agents: the demand side. Graph nodes only, no credit relationship. */
export interface BuyerState {
  address: Address;
  label: string;
  /** Which selling agents this buyer pays. Drives graph edges. */
  buysFrom: Address[];
  paymentsTotal: number;
  spendTotal: Micro;
  lastPaymentAt: Millis;
}

export interface LenderState {
  address: Address;
  label: string;
  shares: bigint;
  /** Current value of those shares. */
  value: Micro;
  depositedAt: Millis;
}

/** Headline instrument readings. Every rolling counter on the page reads these. */
export interface StreamStats {
  paymentsPerMin: number;
  paymentsTotal: number;
  /** Lifetime gross nanopayment volume across all agents. */
  volumeTotal: Micro;
  splitsTotal: number;
  /** Lifetime USDC routed to the vault as debt service. */
  routedToVault: Micro;
  activeAgents: number;
  /** Mean score across agents with a score. Rounded to an integer. */
  avgScore: number;
  /** Smallest payment seen this session. Proves the nanopayment claim. */
  smallestPayment: Micro;
  /** Wall-clock ms since start(). */
  uptimeMs: number;
}

/**
 * The complete world at one instant. Recomputed by the stream and pushed to
 * onSnapshot subscribers at most once per animation frame. Treat every field
 * as immutable: producers replace objects, they never mutate them.
 */
export interface StreamSnapshot {
  at: Millis;
  mode: StreamMode;
  status: StreamStatus;
  vault: VaultState;
  /** Sorted by score descending, then by revenueTotal descending. */
  agents: AgentState[];
  buyers: BuyerState[];
  lenders: LenderState[];
  stats: StreamStats;
  /** The agent the page features: the hero graph and score dial center on it. */
  featuredAgent: Address | null;
  /** Human-readable reason the stream is stalled or errored. */
  note?: string;
}

// ---------------------------------------------------------------------------
// The stream interface
// ---------------------------------------------------------------------------

export type EventListener = (event: TributaryEvent) => void;
export type SnapshotListener = (snapshot: StreamSnapshot) => void;
/** Every subscribe returns its own unsubscribe. Idempotent. */
export type Unsubscribe = () => void;

/**
 * The single source of truth for the whole UI.
 *
 * Two implementations, identical behaviour:
 *   - src/data/simulator/createSimulator.ts  (seeded, deterministic, offline)
 *   - src/data/chain/createChainStream.ts    (viem watchers + reads on Arc)
 *
 * Implementation rules, binding on both:
 *   1. `subscribe` fires only for events after the moment of subscription.
 *      Use `history()` for what already happened.
 *   2. `onSnapshot` fires immediately with the current snapshot, then on
 *      change, coalesced to at most one call per frame.
 *   3. Listeners must never throw into the producer: wrap each call.
 *   4. `start()` and `stop()` are idempotent and may be called repeatedly.
 *      `stop()` must release every timer, watcher and socket.
 *   5. Events are emitted in `seq` order with no gaps.
 *   6. A payment and its split are separate events. The split may arrive in a
 *      later batch, exactly like a real flush.
 */
export interface EventStream {
  readonly mode: StreamMode;
  /** Seed string in demo mode; the RPC url in chain mode. Shown in the banner. */
  readonly source: string;
  readonly status: StreamStatus;

  start(): void;
  stop(): void;

  subscribe(listener: EventListener): Unsubscribe;
  onSnapshot(listener: SnapshotListener): Unsubscribe;

  /** Newest last. Capped by the implementation's ring buffer (>= 200). */
  history(limit?: number): TributaryEvent[];
  snapshot(): StreamSnapshot;
}
