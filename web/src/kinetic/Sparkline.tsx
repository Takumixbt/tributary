/*
 * Per-agent revenue sparkline. Zone: src/kinetic/**.
 *
 * A 1px stroke where only the newest point gets a small shadowBlur glow and a
 * 2px overshoot on entry. Blur on one point is cheap; blur on the whole path is
 * not, and would also read as color in a monochrome system.
 *
 * The canvas redraws on new data and for the ~220ms the head takes to arrive,
 * then stops. An idle sparkline costs nothing per frame.
 */

import { memo, useEffect, useRef } from "react";
import { EASE, clamp } from "../lib/motion";
import { fitCanvas, ink } from "../lib/paint";
import { useMotion, useTick } from "./MotionProvider";
import "./kinetic.css";

const ENTRY_MS = 220;

export interface SparklineProps {
  /** Oldest first. Micro-USDC as plain numbers, per lib/types Series. */
  values: number[];
  width?: number;
  height?: number;
  /** Animate the newest point in. Off for static historical charts. */
  live?: boolean;
  className?: string;
}

function SparklineImpl({ values, width = 96, height = 24, live = true, className }: SparklineProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { motionScale } = useMotion();

  const data = useRef(values);
  data.current = values;
  const entry = useRef(1);
  const dirty = useRef(true);
  const reduced = motionScale === 0;

  // New data restarts the head entry. Identity comparison is enough: producers
  // replace the series array, they never mutate it.
  useEffect(() => {
    entry.current = live && !reduced ? 0 : 1;
    dirty.current = true;
  }, [values, live, reduced]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    fitCanvas(canvas, width, height);
    dirty.current = true;
  }, [width, height]);

  useTick((dt) => {
    if (entry.current < 1) {
      entry.current = clamp(entry.current + dt / ENTRY_MS, 0, 1);
      dirty.current = true;
    }
    if (!dirty.current) return;
    dirty.current = false;

    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const series = data.current;
    ctx.clearRect(0, 0, width, height);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;

    // Baseline: the chart has structure even before it has data.
    ctx.strokeStyle = ink(1, 0.1);
    ctx.beginPath();
    ctx.moveTo(0, height - 0.5);
    ctx.lineTo(width, height - 0.5);
    ctx.stroke();

    if (series.length < 2) return;

    const peak = Math.max(...series, 1);
    const step = (width - 2) / (series.length - 1);
    const yOf = (v: number) => height - 1.5 - (v / peak) * (height - 4);
    const t = EASE.out(entry.current);

    ctx.strokeStyle = ink(1, 0.5);
    ctx.beginPath();
    for (let i = 0; i < series.length; i++) {
      const x = 1 + i * step;
      const last = i === series.length - 1;
      const value = last ? series[i] * t : series[i];
      const y = yOf(value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // The one point allowed to glow, with a 2px overshoot on arrival.
    const hx = 1 + (series.length - 1) * step;
    const hy = yOf(series[series.length - 1] * t);
    const radius = 1.4 + 1.2 * (1 - t);
    ctx.shadowBlur = 6 * t;
    ctx.shadowColor = ink(1, 0.55);
    ctx.fillStyle = ink(1, 1);
    ctx.beginPath();
    ctx.arc(hx, hy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  return (
    <canvas
      ref={ref}
      className={`sparkline${className ? " " + className : ""}`}
      aria-hidden="true"
      style={{ width, height }}
    />
  );
}

export const Sparkline = memo(SparklineImpl);

export default Sparkline;
