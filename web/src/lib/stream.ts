/*
 * Stream plumbing. FROZEN: owned by the design lead.
 *
 * Both the simulator and the chain reader are built on the hub in this file, so
 * the subscribe/snapshot contract in types.ts is implemented exactly once.
 * A producer's job is then only: mint events, reduce state, push a snapshot.
 */

import type {
  Address,
  EventBase,
  EventKind,
  EventListener,
  EventStream,
  Millis,
  Series,
  SnapshotListener,
  StreamMode,
  StreamSnapshot,
  StreamStats,
  StreamStatus,
  TributaryEvent,
  Unsubscribe,
  VaultState,
} from "./types";

/** What a producer supplies. The hub fills in id, seq, at and simulated. */
export type EventDraft<K extends EventKind> = Omit<
  Extract<TributaryEvent, { kind: K }>,
  keyof EventBase | "kind"
> &
  Partial<Pick<EventBase, "at" | "txHash" | "blockNumber">>;

export interface EventHub {
  readonly mode: StreamMode;
  readonly source: string;
  readonly status: StreamStatus;

  /** Mint, record and broadcast one event. Returns the completed event. */
  emit<K extends EventKind>(kind: K, draft: EventDraft<K>): Extract<TributaryEvent, { kind: K }>;

  /** Replace the snapshot. Broadcast is coalesced to one call per frame. */
  setSnapshot(next: StreamSnapshot | ((current: StreamSnapshot) => StreamSnapshot)): void;
  setStatus(status: StreamStatus, note?: string): void;

  subscribe(listener: EventListener): Unsubscribe;
  onSnapshot(listener: SnapshotListener): Unsubscribe;
  history(limit?: number): TributaryEvent[];
  snapshot(): StreamSnapshot;

  /** Drop every listener and cancel the pending frame. Idempotent. */
  dispose(): void;
}

export interface HubInit {
  mode: StreamMode;
  source: string;
  snapshot: StreamSnapshot;
  /** Ring buffer size. Minimum 200 by contract. */
  historyLimit?: number;
  now?: () => Millis;
}

function safely(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    console.error("[tributary] stream listener threw", error);
  }
}

export function createEventHub(init: HubInit): EventHub {
  const now = init.now ?? (() => Date.now());
  const limit = Math.max(200, init.historyLimit ?? 400);
  const eventListeners = new Set<EventListener>();
  const snapshotListeners = new Set<SnapshotListener>();
  const ring: TributaryEvent[] = [];

  let seq = 0;
  let current = init.snapshot;
  let status: StreamStatus = init.snapshot.status;
  let frame: number | null = null;
  let disposed = false;

  const flush = () => {
    frame = null;
    const value = current;
    for (const listener of snapshotListeners) safely(() => listener(value));
  };

  const schedule = () => {
    if (disposed || frame !== null) return;
    frame =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame(flush)
        : (setTimeout(flush, 16) as unknown as number);
  };

  const cancel = () => {
    if (frame === null) return;
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
    else clearTimeout(frame as unknown as ReturnType<typeof setTimeout>);
    frame = null;
  };

  const hub: EventHub = {
    mode: init.mode,
    source: init.source,
    get status() {
      return status;
    },

    emit(kind, draft) {
      seq += 1;
      const { at, txHash, blockNumber, ...rest } = draft as EventDraft<typeof kind> & {
        at?: Millis;
      };
      const event = {
        ...rest,
        kind,
        id: `${kind}-${seq}`,
        seq,
        at: at ?? now(),
        simulated: init.mode === "demo",
        ...(txHash ? { txHash } : {}),
        ...(blockNumber !== undefined ? { blockNumber } : {}),
      } as Extract<TributaryEvent, { kind: typeof kind }>;

      ring.push(event);
      if (ring.length > limit) ring.splice(0, ring.length - limit);
      for (const listener of eventListeners) safely(() => listener(event));
      return event;
    },

    setSnapshot(next) {
      const value = typeof next === "function" ? next(current) : next;
      current = value.status === status ? value : { ...value, status };
      schedule();
    },

    setStatus(nextStatus, note) {
      if (status === nextStatus && current.note === note) return;
      status = nextStatus;
      current = { ...current, status: nextStatus, ...(note ? { note } : {}) };
      schedule();
    },

    subscribe(listener) {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },

    onSnapshot(listener) {
      snapshotListeners.add(listener);
      // Contract: fire immediately with the current world.
      safely(() => listener(current));
      return () => snapshotListeners.delete(listener);
    },

    history(count) {
      if (!count || count >= ring.length) return ring.slice();
      return ring.slice(ring.length - count);
    },

    snapshot() {
      return current;
    },

    dispose() {
      disposed = true;
      cancel();
      eventListeners.clear();
      snapshotListeners.clear();
    },
  };

  return hub;
}

/** Wrap a hub plus a lifecycle into the public EventStream shape. */
export function hubToStream(
  hub: EventHub,
  lifecycle: { start: () => void; stop: () => void },
): EventStream {
  let running = false;
  return {
    mode: hub.mode,
    source: hub.source,
    get status() {
      return hub.status;
    },
    start() {
      if (running) return;
      running = true;
      lifecycle.start();
    },
    stop() {
      if (!running) return;
      running = false;
      lifecycle.stop();
    },
    subscribe: (listener) => hub.subscribe(listener),
    onSnapshot: (listener) => hub.onSnapshot(listener),
    history: (limit) => hub.history(limit),
    snapshot: () => hub.snapshot(),
  };
}

// ---------------------------------------------------------------------------
// Empty state factories
// ---------------------------------------------------------------------------

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export function emptySeries(length = 48, bucketMs = 5_000): Series {
  return { bucketMs, values: new Array<number>(length).fill(0) };
}

export function emptyStats(): StreamStats {
  return {
    paymentsPerMin: 0,
    paymentsTotal: 0,
    volumeTotal: 0n,
    splitsTotal: 0,
    routedToVault: 0n,
    activeAgents: 0,
    avgScore: 0,
    smallestPayment: 0n,
    uptimeMs: 0,
  };
}

export function emptyVaultState(address: Address = ZERO_ADDRESS): VaultState {
  return {
    address,
    totalAssets: 0n,
    availableLiquidity: 0n,
    totalPrincipal: 0n,
    totalShares: 0n,
    sharePrice: 1_000_000n,
    utilizationBps: 0,
    apyBps: 0,
    interestEarned: 0n,
    drawnTotal: 0n,
    repaidTotal: 0n,
    lenderCount: 0,
    agentsFunded: 0,
    assetsSeries: emptySeries(),
    updatedAt: 0,
  };
}

export function emptySnapshot(mode: StreamMode, vaultAddress?: Address): StreamSnapshot {
  return {
    at: 0,
    mode,
    status: "idle",
    vault: emptyVaultState(vaultAddress),
    agents: [],
    buyers: [],
    lenders: [],
    stats: emptyStats(),
    featuredAgent: null,
  };
}

/**
 * A stream that satisfies the contract and never emits. Used by the scaffold
 * before the real producers exist, and as the chain-mode value while the first
 * reads are still in flight.
 */
export function createNullStream(mode: StreamMode = "demo", source = "none"): EventStream {
  const hub = createEventHub({ mode, source, snapshot: emptySnapshot(mode) });
  return hubToStream(hub, {
    start: () => hub.setStatus("idle", "stream not connected"),
    stop: () => hub.dispose(),
  });
}
