/*
 * Variable-weight throughput pulse. Zone: src/kinetic/**.
 *
 * The hero headline is set in a variable font and a sine wave of weight travels
 * through its letters at a speed proportional to live payments per minute. The
 * amplitude is deliberately small: the reader should feel the throughput, not
 * notice a gimmick. Hard cap the weight band at 450-620.
 *
 * Weights are written as a custom property per character from the shared frame,
 * and only when a character's weight has actually moved by more than a step the
 * rasteriser can show.
 */

import { memo, useRef } from "react";
import { clamp } from "../lib/motion";
import { useMotion, useTick } from "./MotionProvider";
import "./kinetic.css";

/** Radians per ms at zero throughput, and the gain per payment per minute. */
const BASE_SPEED = 0.00085;
const RATE_GAIN = 0.0000135;
/** Phase offset between neighbouring characters. */
const SPREAD = 0.34;

export interface WeightWaveProps {
  children: string;
  /** Live payments per minute. Drives wave speed. */
  rate?: number;
  /** Weight band. Do not widen: heavier swings read as a broken font. */
  min?: number;
  max?: number;
  className?: string;
}

function WeightWaveImpl({ children, rate = 0, min = 450, max = 620, className }: WeightWaveProps) {
  const { motionScale } = useMotion();
  const chars = useRef(new Map<number, HTMLSpanElement>());
  const written = useRef(new Map<number, number>());
  const phase = useRef(0);

  const rateRef = useRef(rate);
  rateRef.current = rate;
  const bandRef = useRef({ min, max });
  bandRef.current = { min, max };
  const reducedRef = useRef(motionScale === 0);
  reducedRef.current = motionScale === 0;
  const held = useRef(false);

  useTick((dt) => {
    if (reducedRef.current) {
      if (held.current) return;
      held.current = true;
      for (const [index, node] of chars.current) {
        node.style.setProperty("--char-weight", "500");
        written.current.set(index, 500);
      }
      return;
    }
    held.current = false;

    const speed = BASE_SPEED + RATE_GAIN * clamp(rateRef.current, 0, 600);
    phase.current += speed * dt;

    const low = clamp(bandRef.current.min, 400, 700);
    const high = clamp(bandRef.current.max, low, 700);
    const mid = (low + high) / 2;
    const amplitude = (high - low) / 2;

    for (const [index, node] of chars.current) {
      const weight = Math.round(mid + amplitude * Math.sin(phase.current - index * SPREAD));
      if (written.current.get(index) === weight) continue;
      written.current.set(index, weight);
      node.style.setProperty("--char-weight", `${weight}`);
    }
  });

  return (
    <span className={`weight-wave${className ? " " + className : ""}`}>
      <span className="sr-only">{children}</span>
      {Array.from(children).map((char, i) =>
        /* A space stays a real text node so a long claim can still wrap. */
        char === " " ? (
          " "
        ) : (
          <span
            key={`${char}-${i}`}
            className="weight-wave-char"
            aria-hidden="true"
            ref={(el) => {
              if (el) chars.current.set(i, el);
              else {
                chars.current.delete(i);
                written.current.delete(i);
              }
            }}
          >
            {char}
          </span>
        ),
      )}
    </span>
  );
}

export const WeightWave = memo(WeightWaveImpl);

export default WeightWave;
