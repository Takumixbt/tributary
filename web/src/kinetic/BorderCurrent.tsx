/*
 * Border current. Zone: src/kinetic/**.
 *
 * When a payment routes to a panel, a short bright segment travels around that
 * panel's border: an SVG rect overlay animating stroke-dashoffset. It reads as
 * electricity arriving through a wire and is what links the graph world to the
 * DOM world. Drop it inside any position: relative panel.
 *
 * Under reduced motion the segment does not travel: the whole border lights once
 * and decays, because the information is "something arrived here", not the trip.
 */

import { memo, useEffect, useRef, useState } from "react";
import { clamp, smoothstep } from "../lib/motion";
import { useMotion, useTick } from "./MotionProvider";
import "./kinetic.css";

export interface BorderCurrentProps {
  /** Increment to fire one traversal. Usually an event counter. */
  trigger: number;
  /** Travel duration in ms. Default 620. */
  duration?: number;
  /** Which way the current runs. */
  direction?: "cw" | "ccw";
  className?: string;
}

function BorderCurrentImpl({
  trigger,
  duration = 620,
  direction = "cw",
  className,
}: BorderCurrentProps) {
  const svg = useRef<SVGSVGElement | null>(null);
  const rect = useRef<SVGRectElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const { motionScale } = useMotion();

  const seen = useRef(trigger);
  const progress = useRef(1);
  const triggerRef = useRef(trigger);
  triggerRef.current = trigger;
  const reducedRef = useRef(motionScale === 0);
  reducedRef.current = motionScale === 0;
  const boxRef = useRef(box);
  boxRef.current = box;

  useEffect(() => {
    const node = svg.current;
    if (!node) return;
    const measure = () => {
      const r = node.getBoundingClientRect();
      setBox((current) =>
        Math.abs(current.w - r.width) < 1 && Math.abs(current.h - r.height) < 1
          ? current
          : { w: r.width, h: r.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useTick((dt) => {
    if (seen.current !== triggerRef.current) {
      seen.current = triggerRef.current;
      progress.current = 0;
    }
    if (progress.current >= 1) return;

    const span = reducedRef.current ? 400 : duration;
    progress.current = clamp(progress.current + dt / span, 0, 1);

    const node = rect.current;
    const { w, h } = boxRef.current;
    if (!node || w < 2 || h < 2) return;

    const perimeter = 2 * (w - 1) + 2 * (h - 1);
    const p = progress.current;

    if (reducedRef.current) {
      node.style.strokeDasharray = `${perimeter}`;
      node.style.strokeDashoffset = "0";
      node.style.opacity = `${1 - smoothstep(p)}`;
      return;
    }

    const segment = clamp(perimeter * 0.16, 40, 240);
    const travelled = p * (perimeter + segment);
    const sign = direction === "cw" ? 1 : -1;
    node.style.strokeDasharray = `${segment} ${perimeter}`;
    node.style.strokeDashoffset = `${sign * (segment - travelled)}`;
    node.style.opacity = `${clamp(p / 0.1, 0, 1) * (1 - smoothstep((p - 0.68) / 0.32))}`;
  });

  return (
    <svg
      ref={svg}
      className={`border-current${className ? " " + className : ""}`}
      aria-hidden="true"
      viewBox={`0 0 ${Math.max(1, box.w)} ${Math.max(1, box.h)}`}
      preserveAspectRatio="none"
    >
      <rect
        ref={rect}
        x="0.5"
        y="0.5"
        width={Math.max(1, box.w - 1)}
        height={Math.max(1, box.h - 1)}
      />
    </svg>
  );
}

export const BorderCurrent = memo(BorderCurrentImpl);

export default BorderCurrent;
