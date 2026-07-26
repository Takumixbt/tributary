/*
 * The one moving strip in the product. Zone: src/kinetic/**.
 *
 * It sits at the bottom edge of the hero and carries five facts past at a walk.
 * It runs off the shared frame rather than a CSS animation, so it stays in
 * phase with everything else on the page and costs one transform per frame.
 *
 * Copies of the children repeat until they overflow the container, so the loop
 * has no seam. It stops under the pointer, because a strip a reader cannot read
 * is decoration. Under reduced motion it never starts and reads as a static row
 * of the same facts.
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
  /** Hold still while the pointer is over the strip. Default true. */
  pauseOnHover?: boolean;
  className?: string;
  /** Describes the strip for a screen reader, since the copies are duplicates. */
  label?: string;
}

function MarqueeImpl({
  children,
  speed = 26,
  reverse = false,
  pauseOnHover = true,
  className,
  label,
}: MarqueeProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  const copy = useRef<HTMLDivElement | null>(null);
  const span = useRef(0);
  const offset = useRef(0);
  const paused = useRef(false);
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
    if (reducedRef.current || paused.current || span.current < 8) return;
    offset.current = wrap(offset.current + (speed * dt) / 1000, span.current);
    const node = track.current;
    if (!node) return;
    const x = reverse ? offset.current - span.current : -offset.current;
    node.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
  });

  return (
    <div
      className={`marquee${className ? " " + className : ""}`}
      ref={host}
      aria-label={label}
      onPointerEnter={pauseOnHover ? () => (paused.current = true) : undefined}
      onPointerLeave={pauseOnHover ? () => (paused.current = false) : undefined}
    >
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
