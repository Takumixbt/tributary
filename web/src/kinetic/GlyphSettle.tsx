/*
 * Glyph settle. Zone: src/kinetic/**.
 *
 * On a rare high-signal change (a credit score moving, a line opening, a debt
 * clearing) the new characters run through two or three frames of random
 * monospace glyphs before settling. A CRT decode, not a slot machine. Reserve it
 * for events a human should notice: using it on the payment tape would make the
 * page feel like a toy.
 *
 * The scramble is written straight to textContent from the shared frame, so a
 * decoding number costs no React work at all.
 */

import { memo, useEffect, useRef } from "react";
import { useMotion, useTick } from "./MotionProvider";
import "./kinetic.css";

const GLYPHS = "0123456789#+=/\\|<>";
/** ms per scramble frame. Fast enough to read as decode, not as noise. */
const FRAME_MS = 58;

export interface GlyphSettleProps {
  /** The settled text. Changing it triggers the decode. */
  value: string;
  /** Scramble frames before settling. Default 3. Keep it under 5. */
  frames?: number;
  className?: string;
}

function GlyphSettleImpl({ value, frames = 3, className }: GlyphSettleProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const { motionScale } = useMotion();

  const valueRef = useRef(value);
  valueRef.current = value;
  const seen = useRef(value);
  const elapsed = useRef(Infinity);
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const reducedRef = useRef(motionScale === 0);
  reducedRef.current = motionScale === 0;

  useEffect(() => {
    const node = ref.current;
    if (node) node.textContent = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useTick((dt) => {
    const node = ref.current;
    if (!node) return;

    if (seen.current !== valueRef.current) {
      seen.current = valueRef.current;
      if (reducedRef.current) {
        node.textContent = valueRef.current;
        elapsed.current = Infinity;
        return;
      }
      elapsed.current = 0;
    }

    if (elapsed.current === Infinity) return;

    const total = framesRef.current * FRAME_MS;
    const previous = elapsed.current;
    elapsed.current += dt;
    if (elapsed.current >= total) {
      node.textContent = seen.current;
      elapsed.current = Infinity;
      return;
    }
    // One repaint per scramble frame, not one per animation frame.
    if (Math.floor(previous / FRAME_MS) === Math.floor(elapsed.current / FRAME_MS) && previous > 0) {
      return;
    }

    const settled = seen.current;
    const progress = elapsed.current / total;
    let out = "";
    for (let i = 0; i < settled.length; i++) {
      const char = settled[i];
      const done = (i + 1) / settled.length <= progress * 1.35;
      if (done || char === " " || char === "." || char === "%") out += char;
      else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    node.textContent = out;
  });

  return (
    <span
      ref={ref}
      className={`glyph-settle num${className ? " " + className : ""}`}
      role="img"
      aria-label={value}
    />
  );
}

export const GlyphSettle = memo(GlyphSettleImpl);

export default GlyphSettle;
