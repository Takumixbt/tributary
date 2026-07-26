/*
 * DOM anchor registry. Zone: src/graph/**.
 *
 * Panels and sections in other zones drop a <GraphAnchor> marker. The graph
 * measures it and terminates real edges on it, so pulses fly out of the
 * simulation and arrive inside the UI. This is what makes the graph bleed
 * through the page instead of sitting in a box.
 *
 * The registry only collects rects. The graph engine reads them through
 * `useAnchorRects()` and decides what to connect, so a zone can register an anchor
 * without knowing anything about the simulation.
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
import type { AnchorBind, AnchorId, AnchorSide } from "../lib/stage";

export interface AnchorRect {
  id: AnchorId;
  bind: AnchorBind;
  side: AnchorSide;
  /** Connection point in viewport pixels, already resolved from `side`. */
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnchorRegistry {
  register(id: AnchorId, bind: AnchorBind, side: AnchorSide, el: HTMLElement): () => void;
  /** Live map. Mutated in place by the registry, read every frame by the engine. */
  rects: Map<AnchorId, AnchorRect>;
  /** Bump to force a re-measure, e.g. after a route change. */
  measure(): void;
}

const AnchorContext = createContext<AnchorRegistry | null>(null);

export function GraphAnchorProvider({ children }: { children: ReactNode }) {
  const rects = useMemo(() => new Map<AnchorId, AnchorRect>(), []);
  const entries = useRef(new Map<AnchorId, { bind: AnchorBind; side: AnchorSide; el: HTMLElement }>());

  const measure = useCallback(() => {
    for (const [id, entry] of entries.current) {
      const box = entry.el.getBoundingClientRect();
      const point = resolveSide(box, entry.side);
      rects.set(id, {
        id,
        bind: entry.bind,
        side: entry.side,
        x: point.x,
        y: point.y,
        width: box.width,
        height: box.height,
      });
    }
  }, [rects]);

  const register = useCallback<AnchorRegistry["register"]>(
    (id, bind, side, el) => {
      entries.current.set(id, { bind, side, el });
      measure();
      return () => {
        entries.current.delete(id);
        rects.delete(id);
      };
    },
    [measure, rects],
  );

  useEffect(() => {
    measure();
    const onChange = () => measure();
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [measure]);

  const value = useMemo<AnchorRegistry>(() => ({ register, rects, measure }), [register, rects, measure]);
  return <AnchorContext.Provider value={value}>{children}</AnchorContext.Provider>;
}

function resolveSide(box: DOMRect, side: AnchorSide): { x: number; y: number } {
  switch (side) {
    case "left":
      return { x: box.left, y: box.top + box.height / 2 };
    case "right":
      return { x: box.right, y: box.top + box.height / 2 };
    case "top":
      return { x: box.left + box.width / 2, y: box.top };
    case "bottom":
      return { x: box.left + box.width / 2, y: box.bottom };
    default:
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }
}

/**
 * Attach an anchor to an element you already render.
 *
 *   const ref = useGraphAnchor(ANCHORS.vaultPanel, "vault", "left");
 *   return <section ref={ref} className="panel">...</section>;
 */
export function useGraphAnchor(id: AnchorId, bind: AnchorBind, side: AnchorSide = "left") {
  const registry = useContext(AnchorContext);
  const [el, setEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!registry || !el) return;
    const unregister = registry.register(id, bind, side, el);
    const observer = new ResizeObserver(() => registry.measure());
    observer.observe(el);
    return () => {
      observer.disconnect();
      unregister();
    };
  }, [registry, el, id, bind, side]);

  return setEl;
}

/**
 * Zero-size marker version, for when you want the connection point somewhere
 * other than a panel's own bounding box.
 */
export function GraphAnchor({
  id,
  bind,
  side = "center",
}: {
  id: AnchorId;
  bind: AnchorBind;
  side?: AnchorSide;
}) {
  const ref = useGraphAnchor(id, bind, side);
  return <span ref={ref} aria-hidden="true" data-graph-anchor={id} style={{ display: "block" }} />;
}

/** Engine-side read access. Returns the live map, not a copy. */
export function useAnchorRects(): Map<AnchorId, AnchorRect> {
  const registry = useContext(AnchorContext);
  const fallback = useMemo(() => new Map<AnchorId, AnchorRect>(), []);
  return registry?.rects ?? fallback;
}
