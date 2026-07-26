/*
 * Cursor-proximity dot grid. Zone: src/kinetic/**.
 *
 * Background dots within ~120px of the pointer lift in brightness and scale.
 * When the pointer is idle or absent, the newest payment pulse's screen position
 * takes the cursor's role, so the surface is always alive during a hands-off
 * demo. Pass the ref from useLatestPulsePoint() as `follow`.
 *
 * Only the region around the attractor is repainted each frame: the rest of the
 * field is left on the canvas from the initial full paint. Dots are batched into
 * eight brightness buckets so a frame is eight fillStyle changes, not two
 * thousand.
 */

import { memo, useEffect, useRef, type MutableRefObject } from "react";
import { clamp, smoothstep } from "../lib/motion";
import { fitCanvas, ink } from "../lib/paint";
import { useMotion, useTick } from "./MotionProvider";
import "./kinetic.css";

const BASE_ALPHA = 0.12;
const LIVE_ALPHA = 0.62;
const BUCKETS = 8;
/** After this long without pointer movement, the payment pulse takes over. */
const IDLE_MS = 2200;

export interface DotGridProps {
  /** Grid pitch in px. Default 26. */
  spacing?: number;
  /** Influence radius in px. Default 120. */
  reach?: number;
  /** Fallback attractor when the pointer is idle. */
  follow?: MutableRefObject<{ x: number; y: number } | null>;
  className?: string;
}

function DotGridImpl({ spacing = 26, reach = 120, follow, className }: DotGridProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { motionScale } = useMotion();

  const size = useRef({ w: 0, h: 0 });
  const origin = useRef({ x: 0, y: 0 });
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const pointerAt = useRef(0);
  const attractor = useRef<{ x: number; y: number } | null>(null);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const reducedRef = useRef(motionScale === 0);
  reducedRef.current = motionScale === 0;

  const paintBase = () => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h } = size.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = ink(1, BASE_ALPHA);
    for (let y = spacing / 2; y < h; y += spacing) {
      for (let x = spacing / 2; x < w; x += spacing) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
    previous.current = null;
  };

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const measure = () => {
      const box = host.getBoundingClientRect();
      origin.current = { x: box.left, y: box.top };
      const w = Math.max(1, Math.round(box.width));
      const h = Math.max(1, Math.round(box.height));
      if (w !== size.current.w || h !== size.current.h) {
        size.current = { w, h };
        fitCanvas(canvas, w, h);
        paintBase();
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spacing]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      pointerAt.current = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useTick((dt, now) => {
    if (reducedRef.current) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const usePointer = pointer.current && now - pointerAt.current < IDLE_MS;
    const source = usePointer ? pointer.current : (follow?.current ?? null);
    const next = source
      ? { x: source.x - origin.current.x, y: source.y - origin.current.y }
      : null;

    const same =
      next &&
      attractor.current &&
      Math.abs(next.x - attractor.current.x) < 0.5 &&
      Math.abs(next.y - attractor.current.y) < 0.5;
    attractor.current = next;
    if (same && !previous.current) return;

    const { w, h } = size.current;
    const pad = reach + spacing;
    const regions: Array<{ x: number; y: number }> = [];
    if (previous.current) regions.push(previous.current);
    if (next) regions.push(next);
    if (regions.length === 0) return;

    for (const region of regions) {
      const x0 = clamp(region.x - pad, 0, w);
      const y0 = clamp(region.y - pad, 0, h);
      const x1 = clamp(region.x + pad, 0, w);
      const y1 = clamp(region.y + pad, 0, h);
      if (x1 <= x0 || y1 <= y0) continue;
      ctx.clearRect(x0, y0, x1 - x0, y1 - y0);

      const buckets: number[][] = Array.from({ length: BUCKETS }, () => []);
      const startX = Math.floor((x0 - spacing / 2) / spacing) * spacing + spacing / 2;
      const startY = Math.floor((y0 - spacing / 2) / spacing) * spacing + spacing / 2;

      for (let y = startY; y <= y1; y += spacing) {
        if (y < 0) continue;
        for (let x = startX; x <= x1; x += spacing) {
          if (x < 0) continue;
          let lift = 0;
          if (next) {
            const d = Math.hypot(x - next.x, y - next.y);
            lift = d < reach ? smoothstep(1 - d / reach) : 0;
          }
          const bucket = Math.min(BUCKETS - 1, Math.round(lift * (BUCKETS - 1)));
          buckets[bucket].push(x, y);
        }
      }

      for (let b = 0; b < BUCKETS; b++) {
        const points = buckets[b];
        if (points.length === 0) continue;
        const lift = b / (BUCKETS - 1);
        const alpha = BASE_ALPHA + (LIVE_ALPHA - BASE_ALPHA) * lift;
        const dot = 1 + 0.9 * lift;
        ctx.fillStyle = ink(1, alpha);
        for (let i = 0; i < points.length; i += 2) {
          ctx.fillRect(points[i], points[i + 1], dot, dot);
        }
      }
    }

    previous.current = next;
  });

  return (
    <canvas ref={ref} className={`dotgrid${className ? " " + className : ""}`} aria-hidden="true" />
  );
}

export const DotGrid = memo(DotGridImpl);

export default DotGrid;
