/*
 * Status strip. Zone: src/kinetic/**.
 *
 * The ledger tape laid on its side, for surfaces that have a wide row and no
 * column to spare. Same rule as the tape: it exists because events exist, and it
 * runs off the one shared frame rather than a CSS animation, so it stays in phase
 * with the dither, the counters and the graph.
 *
 * Copies of the children repeat until they overflow the container, so the loop
 * has no seam even when there are only two rows to show. Under reduced motion the
 * strip holds still and reads as a static row of the same facts.
 */

import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { wrap } from "../lib/motion";
import { useMotion, useTick } from "./MotionProvider";
import "./kinetic.css";

export interface MarqueeProps {
  children: ReactNode;
  /** px per second. Slow is correct: this is a status strip, not a banner. */
  speed?: number;
  /** Reverse the travel direction. */
  reverse?: boolean;
  className?: string;
}

function MarqueeImpl({ children, speed = 26, reverse = false, className }: MarqueeProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  const copy = useRef<HTMLDivElement | null>(null);
  const span = useRef(0);
  const offset = useRef(0);
  const [copies, setCopies] = useState(2);
  const { motionScale } = useMotion();
  const reducedRef = useRef(motionScale === 0);
  reducedRef.current = motionScale === 0;

  useEffect(() => {
    const sample = copy.current;
    const outer = host.current;
    if (!sample || !outer) return;

    const measure = () => {
      const width = sample.scrollWidth;
      span.current = width;
      const needed = width > 8 ? Math.ceil(outer.clientWidth / width) + 1 : 2;
      setCopies((current) => (current === Math.max(2, needed) ? current : Math.max(2, needed)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sample);
    observer.observe(outer);
    return () => observer.disconnect();
  }, [children]);

  useTick((dt) => {
    if (reducedRef.current || span.current < 8) return;
    offset.current = wrap(offset.current + (speed * dt) / 1000, span.current);
    const node = track.current;
    if (!node) return;
    const x = reverse ? offset.current - span.current : -offset.current;
    node.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
  });

  return (
    <div className={`marquee${className ? " " + className : ""}`} ref={host}>
      <div className="marquee-track" ref={track}>
        <div className="marquee-copy" ref={copy}>
          {children}
        </div>
        {Array.from({ length: Math.max(1, copies - 1) }, (_, i) => (
          <div className="marquee-copy" aria-hidden="true" key={i}>
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}

export const Marquee = memo(MarqueeImpl);

export default Marquee;
