/*
 * Debt-drain hatch bar. Zone: src/kinetic/**.
 *
 * Outstanding debt as a 45-degree 1px hatched region whose background-position
 * animates like a barber pole while repayments stream, with a hard right edge
 * that wipes left as principal clears. Repayment becomes physically watchable.
 * Also used for vault utilization, where the fill grows instead of draining.
 *
 * The barber pole is driven from the shared frame rather than a CSS animation so
 * that it can accelerate on a repayment and so that it stays in phase with the
 * dither field and the graph. Under reduced motion the pole holds still and only
 * the width changes.
 */

import { memo, useRef } from "react";
import { clamp, damp, wrap } from "../lib/motion";
import { useMotion, useTick } from "./MotionProvider";
import "./kinetic.css";

/** One hatch period at 45 degrees over a 5px pitch. */
const PERIOD = 7.07;
/** px per ms at rest, and the extra a fresh repayment buys. */
const REST_SPEED = 0.006;
const BURST_SPEED = 0.055;

export interface HatchBarProps {
  /** Filled amount. Same unit as max. */
  value: number;
  max: number;
  /** "drain" wipes right to left as value falls. "fill" grows left to right. */
  mode?: "drain" | "fill";
  /** Bump on every repayment to speed the barber pole for a moment. */
  activity?: number;
  height?: number;
  label?: string;
  className?: string;
}

function HatchBarImpl({
  value,
  max,
  mode = "drain",
  activity = 0,
  height = 10,
  label,
  className,
}: HatchBarProps) {
  const { motionScale } = useMotion();
  const fill = useRef<HTMLDivElement | null>(null);
  const offset = useRef(0);
  const heat = useRef(0);
  const seen = useRef(activity);

  const activityRef = useRef(activity);
  activityRef.current = activity;
  const reducedRef = useRef(motionScale === 0);
  reducedRef.current = motionScale === 0;

  const pct = max > 0 ? clamp(value / max, 0, 1) : 0;

  useTick((dt) => {
    if (seen.current !== activityRef.current) {
      seen.current = activityRef.current;
      heat.current = 1;
    }
    if (reducedRef.current) return;

    heat.current = damp(heat.current, 0, 420, dt);
    const speed = REST_SPEED + BURST_SPEED * heat.current;
    const direction = mode === "drain" ? -1 : 1;
    offset.current = wrap(offset.current + direction * speed * dt, PERIOD);
    const node = fill.current;
    if (node) node.style.backgroundPosition = `${offset.current.toFixed(2)}px 0`;
  });

  return (
    <div
      className={`hatchbar hatchbar-${mode}${className ? " " + className : ""}`}
      style={{ height }}
      role="img"
      aria-label={label ?? `${Math.round(pct * 100)} percent`}
    >
      <div className="hatchbar-track" />
      <div ref={fill} className="hatchbar-fill" style={{ width: `${pct * 100}%` }} />
      {pct > 0 && pct < 1 ? <div className="hatchbar-edge" style={{ left: `${pct * 100}%` }} /> : null}
    </div>
  );
}

export const HatchBar = memo(HatchBarImpl);

export default HatchBar;
