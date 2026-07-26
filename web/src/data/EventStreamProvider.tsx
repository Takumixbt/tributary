/*
 * The one stream. Zone: src/data/**.
 *
 * Picks the producer from lib/env (demo when addresses are missing or ?demo=1,
 * chain otherwise), starts it on mount, stops it on unmount, and exposes it
 * through context. Nothing else in the app constructs a stream.
 *
 * The simulator has no clock of its own on purpose: this provider advances it
 * from the shared conductor tick, so simulated time is the same time the page is
 * painted in. A private setInterval would let the tape and the graph drift.
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useTick } from "../kinetic";
import { ADDRESSES, DEMO_SEED, DEMO_SPEED, IS_DEMO, RPC_URL } from "../lib/env";
import type { EventStream } from "../lib/types";
import { createChainStream } from "./chain/createChainStream";
import { createSimulator } from "./simulator/createSimulator";
import type { TributaryStream } from "./types";

const StreamContext = createContext<EventStream | null>(null);

export function EventStreamProvider({ children }: { children: ReactNode }) {
  const stream = useMemo<TributaryStream>(
    () =>
      IS_DEMO
        ? createSimulator({ seed: DEMO_SEED, speed: DEMO_SPEED })
        : createChainStream({ addresses: ADDRESSES, rpcUrl: RPC_URL }),
    [],
  );

  useEffect(() => {
    stream.start();
    return () => stream.stop();
  }, [stream]);

  useTick((dtMs) => stream.tick?.(dtMs), Boolean(stream.tick));

  return <StreamContext.Provider value={stream}>{children}</StreamContext.Provider>;
}

/** The raw stream. Prefer the selector hooks in hooks.ts for rendering. */
export function useEventStream(): EventStream {
  const stream = useContext(StreamContext);
  if (!stream) throw new Error("useEventStream must be used inside <EventStreamProvider>");
  return stream;
}
