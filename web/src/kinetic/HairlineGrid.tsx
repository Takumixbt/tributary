/*
 * The grid that becomes the chart. Zone: src/kinetic/**.
 *
 * A hairline field at 0.06 alpha behind the page. When the section it sits in
 * enters the viewport, the grid lines nearest that section's declared axes slide
 * onto them and gain weight, so a chart reads as carved out of the page grid
 * rather than dropped on top of it.
 *
 * `axes` are fractions of the canvas box, not pixels, so a caller can say "the
 * split divider sits at 0.2" without measuring anything.
 */

import { memo, useEffect, useRef } from "react";
import { EASE, clamp, damp } from "../lib/motion";
import { CANVAS, fitCanvas, ink } from "../lib/paint";
import { useMotion, useTick } from "./MotionProvider";
import "./kinetic.css";

export interface HairlineGridProps {
  /** Grid pitch in px. Default matches CANVAS.gridStep. */
  step?: number;
  /** Axis positions as fractions of the box, which the nearest lines migrate to. */
  axes?: { x?: number[]; y?: number[] };
  className?: string;
}

function HairlineGridImpl({ step = CANVAS.gridStep, axes, className }: HairlineGridProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { motionScale } = useMotion();

  const size = useRef({ w: 0, h: 0 });
  const focus = useRef(0);
  const target = useRef(0);
  const dirty = useRef(true);
  const axesRef = useRef(axes);
  axesRef.current = axes;
  const reducedRef = useRef(motionScale === 0);
  reducedRef.current = motionScale === 0;

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const measure = () => {
      const box = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(box.width));
      const h = Math.max(1, Math.round(box.height));
      if (w === size.current.w && h === size.current.h) return;
      size.current = { w, h };
      fitCanvas(canvas, w, h);
      dirty.current = true;
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // The grid only leans into the axes while its section owns the viewport.
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) target.current = record.isIntersecting ? 1 : 0;
      },
      { rootMargin: "-25% 0px -25% 0px" },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useTick((dt) => {
    if (reducedRef.current) {
      if (focus.current !== target.current) {
        focus.current = target.current;
        dirty.current = true;
      }
    } else if (Math.abs(focus.current - target.current) > 0.002) {
      focus.current = damp(focus.current, target.current, 220, dt);
      dirty.current = true;
    }
    if (!dirty.current) return;
    dirty.current = false;

    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h } = size.current;
    ctx.clearRect(0, 0, w, h);

    const t = EASE.out(clamp(focus.current, 0, 1));
    const pull = (lines: number[], targets: number[] | undefined, extent: number) => {
      if (!targets || targets.length === 0) return { moved: lines, axes: [] as number[] };
      const resolved = targets.map((fraction) => clamp(fraction, 0, 1) * extent);
      const claimed = new Set<number>();
      const emphasized: number[] = [];
      const moved = lines.slice();
      for (const axis of resolved) {
        let best = -1;
        let bestDistance = Infinity;
        for (let i = 0; i < moved.length; i++) {
          if (claimed.has(i)) continue;
          const distance = Math.abs(moved[i] - axis);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = i;
          }
        }
        if (best < 0) continue;
        claimed.add(best);
        moved[best] = moved[best] + (axis - moved[best]) * t;
        emphasized.push(best);
      }
      return { moved, axes: emphasized };
    };

    const verticals: number[] = [];
    for (let x = 0.5; x < w; x += step) verticals.push(x);
    const horizontals: number[] = [];
    for (let y = 0.5; y < h; y += step) horizontals.push(y);

    const vx = pull(verticals, axesRef.current?.x, w);
    const hy = pull(horizontals, axesRef.current?.y, h);
    const emphasizedX = new Set(vx.axes);
    const emphasizedY = new Set(hy.axes);

    ctx.lineWidth = 1;
    ctx.strokeStyle = ink(1, CANVAS.gridAlpha);
    ctx.beginPath();
    vx.moved.forEach((x, i) => {
      if (emphasizedX.has(i)) return;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    });
    hy.moved.forEach((y, i) => {
      if (emphasizedY.has(i)) return;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    });
    ctx.stroke();

    if (emphasizedX.size === 0 && emphasizedY.size === 0) return;
    ctx.strokeStyle = ink(1, CANVAS.gridAlpha + 0.16 * t);
    ctx.beginPath();
    for (const i of emphasizedX) {
      ctx.moveTo(vx.moved[i], 0);
      ctx.lineTo(vx.moved[i], h);
    }
    for (const i of emphasizedY) {
      ctx.moveTo(0, hy.moved[i]);
      ctx.lineTo(w, hy.moved[i]);
    }
    ctx.stroke();
  });

  return (
    <canvas ref={ref} className={`hairgrid${className ? " " + className : ""}`} aria-hidden="true" />
  );
}

export const HairlineGrid = memo(HairlineGridImpl);

export default HairlineGrid;
