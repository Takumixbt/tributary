/*
 * The conductor. Zone: src/kinetic/**.
 *
 * One requestAnimationFrame loop for the entire page: dither field, graph
 * physics, counters, pulses, hatch bars. Nothing in this app is allowed to open
 * its own rAF loop. Subscribers get (dtMs, nowMs) and are called in insertion
 * order, so the frame is one coherent instrument reading rather than a dozen
 * independent animations drifting apart.
 *
 * motionScale is the single reduced-motion switch: 1 = full kinetics,
 * 0 = pulses become instant opacity blips, the dither freezes, counters
 * cross-fade instead of rolling. Data never stops updating.
 *
 * The loop pauses on document.hidden and resumes with a clamped dt so nothing
 * jumps after a tab has been in the background.
 *
 * The provider also stamps data-motion="0" on the root element while reduced, so
 * the CSS half of the reduced-motion path is driven by the same decision as the
 * JS half. Without it, ?motion=0 would freeze the canvas layers and leave the
 * barber poles and route transitions running, which is a worse result than
 * either state on its own.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FORCE_REDUCED_MOTION } from "../lib/env";
import { motionScaleFor, prefersReducedMotion, watchReducedMotion } from "../lib/motion";

export type TickListener = (dtMs: number, nowMs: number) => void;

interface MotionApi {
  /** 1 or 0. Read this, do not query the media feature yourself. */
  motionScale: number;
  reduced: boolean;
  /** Subscribe to the shared frame. Returns an unsubscribe. */
  subscribe(listener: TickListener): () => void;
  /** Frames per second, averaged over the last second. Debug overlay only. */
  fpsRef: { current: number };
}

const MotionContext = createContext<MotionApi | null>(null);

const MAX_DT = 48; // clamp so a stalled tab does not teleport every animation

export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(() => FORCE_REDUCED_MOTION || prefersReducedMotion());
  const listeners = useRef(new Set<TickListener>());
  const fpsRef = useRef(60);

  useEffect(() => watchReducedMotion((next) => setReduced(FORCE_REDUCED_MOTION || next)), []);

  // Only ever set or clear "0". Writing "1" could contradict the media query on a
  // machine that asks for reduced motion, and the media query has to keep winning.
  useEffect(() => {
    const root = document.documentElement;
    if (reduced) root.setAttribute("data-motion", "0");
    else root.removeAttribute("data-motion");
  }, [reduced]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let frames = 0;
    let fpsWindow = last;

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(MAX_DT, now - last);
      last = now;

      frames += 1;
      if (now - fpsWindow >= 1000) {
        fpsRef.current = (frames * 1000) / (now - fpsWindow);
        frames = 0;
        fpsWindow = now;
      }

      for (const listener of listeners.current) {
        try {
          listener(dt, now);
        } catch (error) {
          console.error("[tributary] tick listener threw", error);
        }
      }
    };

    const start = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const subscribe = useCallback((listener: TickListener) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  const value = useMemo<MotionApi>(
    () => ({ motionScale: motionScaleFor(reduced), reduced, subscribe, fpsRef }),
    [reduced, subscribe],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion(): MotionApi {
  const api = useContext(MotionContext);
  if (!api) throw new Error("useMotion must be used inside <MotionProvider>");
  return api;
}

/**
 * Subscribe to the shared frame. The callback is kept in a ref, so it may close
 * over changing values without resubscribing.
 *
 *   useTick((dt) => { offset.current += dt * 0.02; });
 */
export function useTick(listener: TickListener, enabled = true): void {
  const { subscribe } = useMotion();
  const ref = useRef(listener);
  ref.current = listener;

  useEffect(() => {
    if (!enabled) return;
    return subscribe((dt, now) => ref.current(dt, now));
  }, [subscribe, enabled]);
}
