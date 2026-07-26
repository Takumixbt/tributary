/*
 * Scroll reveal. Zone: src/kinetic/**.
 *
 * The one decorative transition this design allows: content arrives with a 12px
 * rise and an opacity ramp, once, on first intersection. No parallax, no
 * staggered letter animations, no scroll-jacking. Everything else that moves on
 * this page moves because data moved.
 *
 * It is also the only IntersectionObserver in this zone that changes React
 * state, and it does so exactly once per instance.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import "./kinetic.css";

export interface RevealProps {
  children: ReactNode;
  /** Delay in ms. Keep under 160: this is punctuation, not choreography. */
  delay?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (!record.isIntersecting) continue;
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal${shown ? " is-in" : ""}${className ? " " + className : ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export default Reveal;
