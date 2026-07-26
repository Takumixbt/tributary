/*
 * Read hooks. Zone: src/data/**.
 *
 * The only sanctioned way for the landing page and the terminal to read live
 * state. Two rules keep the page at 60fps:
 *
 *   1. Anything that changes every frame (pulse positions, hatch offsets,
 *      odometer interpolation) is read through a ref inside useTick, never
 *      through React state.
 *   2. Anything that changes per event uses the hooks below, which select a
 *      single slice out of the snapshot through useSyncExternalStore and
 *      re-render only the subtree that asked for it.
 *
 * The producers cooperate with rule 2 by reusing object identity for slices that
 * did not change, so `useVaultState()` holds still between money movements even
 * though a snapshot is published several times a second.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTick } from "../kinetic";
import type {
  Address,
  AgentState,
  BuyerState,
  EventKind,
  LenderState,
  StreamSnapshot,
  StreamStats,
  StreamStatus,
  TributaryEvent,
  VaultState,
} from "../lib/types";
import { useEventStream } from "./EventStreamProvider";
import type { TributaryStream } from "./types";

/**
 * Subscribe to one slice of the world. `isEqual` decides what counts as a
 * change: the default is identity, which is why the producers must not rebuild
 * objects they did not touch.
 */
function useSlice<T>(select: (snapshot: StreamSnapshot) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const stream = useEventStream();
  const selectRef = useRef(select);
  selectRef.current = select;
  const equalRef = useRef(isEqual);
  equalRef.current = isEqual;
  const cache = useRef<{ filled: boolean; value: T }>({ filled: false, value: undefined as unknown as T });

  const read = useCallback(() => {
    const next = selectRef.current(stream.snapshot());
    if (!cache.current.filled || !equalRef.current(cache.current.value, next)) {
      cache.current = { filled: true, value: next };
    }
    return cache.current.value;
  }, [stream]);

  const subscribe = useCallback((onChange: () => void) => stream.onSnapshot(() => onChange()), [stream]);

  return useSyncExternalStore(subscribe, read, read);
}

function sameList<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** The whole world. Re-renders on every publish: prefer a narrower hook. */
export function useSnapshot(): StreamSnapshot {
  return useSlice((snapshot) => snapshot);
}

export function useVaultState(): VaultState {
  return useSlice((snapshot) => snapshot.vault);
}

/** Sorted by score descending, then revenue descending. */
export function useAgents(): AgentState[] {
  return useSlice((snapshot) => snapshot.agents, sameList);
}

export function useAgent(address: Address | null): AgentState | null {
  return useSlice((snapshot) =>
    address ? snapshot.agents.find((agent) => agent.address === address) ?? null : null,
  );
}

/** The agent the page features. Falls back to the highest scorer. */
export function useFeaturedAgent(): AgentState | null {
  return useSlice((snapshot) => {
    const featured = snapshot.featuredAgent;
    if (featured) {
      const match = snapshot.agents.find((agent) => agent.address === featured);
      if (match) return match;
    }
    return snapshot.agents[0] ?? null;
  });
}

export function useBuyers(): BuyerState[] {
  return useSlice((snapshot) => snapshot.buyers, sameList);
}

export function useLenders(): LenderState[] {
  return useSlice((snapshot) => snapshot.lenders, sameList);
}

export function useStats(): StreamStats {
  return useSlice((snapshot) => snapshot.stats);
}

/** Status and the reason behind it. Chain mode uses this to admit it is frozen. */
export function useStreamHealth(): { status: StreamStatus; note?: string } {
  const status = useSlice((snapshot) => snapshot.status);
  const note = useSlice((snapshot) => snapshot.note);
  return useMemo(() => ({ status, ...(note ? { note } : {}) }), [status, note]);
}

/** Move the lens. The roster calls this and the graph camera follows. */
export function useSetFeatured(): (address: Address | null) => void {
  const stream = useEventStream() as TributaryStream;
  return useCallback(
    (address: Address | null) => {
      stream.setFeatured?.(address);
    },
    [stream],
  );
}

/**
 * A rolling window of events, newest first, one re-render per event. Use it for
 * low-rate feeds (scores, splits). For the payment tape use `useEventTape`.
 */
export function useEvents(kinds?: EventKind[], limit = 50): TributaryEvent[] {
  const stream = useEventStream();
  const kindKey = kinds?.join(",") ?? "*";
  const kindsRef = useRef(kinds);
  kindsRef.current = kinds;

  const matches = useCallback((event: TributaryEvent) => {
    const filter = kindsRef.current;
    return !filter || filter.includes(event.kind);
  }, []);

  const [rows, setRows] = useState<TributaryEvent[]>(() =>
    stream.history(limit * 4).filter(matches).slice(-limit).reverse(),
  );

  useEffect(() => {
    setRows(stream.history(limit * 4).filter(matches).slice(-limit).reverse());
    return stream.subscribe((event) => {
      if (!matches(event)) return;
      setRows((current) => [event, ...current].slice(0, limit));
    });
  }, [stream, matches, limit, kindKey]);

  return rows;
}

/** Longest gap between tape flushes. Bursts coalesce into one render. */
const TAPE_FLUSH_MS = 90;

/**
 * The tape. Identical output to `useEvents`, but arrivals are buffered in a ref
 * and committed on the shared frame, at most once every 90ms. Under a burst of
 * forty nanopayments that is one render instead of forty, and every committed row
 * is painted on the frame it was committed in, which is what keeps the white
 * baseline flash aligned with the pulse that caused it.
 */
export function useEventTape(kinds?: EventKind[], limit = 50): TributaryEvent[] {
  const stream = useEventStream();
  const kindKey = kinds?.join(",") ?? "*";
  const kindsRef = useRef(kinds);
  kindsRef.current = kinds;

  const matches = useCallback((event: TributaryEvent) => {
    const filter = kindsRef.current;
    return !filter || filter.includes(event.kind);
  }, []);

  const pending = useRef<TributaryEvent[]>([]);
  const lastFlush = useRef(0);
  const [rows, setRows] = useState<TributaryEvent[]>(() =>
    stream.history(limit * 4).filter(matches).slice(-limit).reverse(),
  );

  useEffect(() => {
    pending.current = [];
    setRows(stream.history(limit * 4).filter(matches).slice(-limit).reverse());
    return stream.subscribe((event) => {
      if (!matches(event)) return;
      pending.current.push(event);
    });
  }, [stream, matches, limit, kindKey]);

  useTick((_dt, now) => {
    if (pending.current.length === 0) return;
    if (now - lastFlush.current < TAPE_FLUSH_MS) return;
    lastFlush.current = now;
    const batch = pending.current;
    pending.current = [];
    batch.reverse();
    setRows((current) => [...batch, ...current].slice(0, limit));
  });

  return rows;
}

/**
 * A counter that increments on every matching event. Feed it to
 * `<BorderCurrent trigger>`, `<DitherField kick>` and anything else that wants
 * "something just happened here".
 */
export function useEventPulse(kinds?: EventKind[]): number {
  const stream = useEventStream();
  const [count, setCount] = useState(0);
  const kindsRef = useRef(kinds);
  kindsRef.current = kinds;

  useEffect(
    () =>
      stream.subscribe((event) => {
        const filter = kindsRef.current;
        if (filter && !filter.includes(event.kind)) return;
        setCount((current) => current + 1);
      }),
    [stream],
  );

  return count;
}
