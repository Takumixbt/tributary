/*
 * Scroll reveal. Zone: src/kinetic/**.
 *
 * The page's one scroll behaviour: content arrives with a small rise and an
 * opacity ramp, once, on first intersection. No parallax, no scroll jacking,
 * nothing that replays when you scroll back up.
 *
 * `rise` is the travel in pixels (4 to 16 is the whole range this design uses)
 * and `long` swaps the 800ms ramp for the 1000ms one the hero headline wants.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "./kinetic.css";

export interface RevealProps {
  children: ReactNode;
  /** Delay in ms. Sections stagger by 100ms, never more. */
  delay?: number;
  /** Travel in px. Default 16. */
  rise?: number;
  /** Use the 1000ms ramp instead of 800ms. */
  long?: boolean;
  className?: string;
}

export function Reveal({ children, delay = 0, rise = 16, long = false, className }: RevealProps) {
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
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties = {
    ["--reveal-rise" as string]: `${rise}px`,
    ...(delay ? { transitionDelay: `${delay}ms` } : {}),
  };

  return (
    <div
      ref={ref}
      className={`reveal${long ? " reveal-long" : ""}${shown ? " is-in" : ""}${className ? " " + className : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

export default Reveal;
