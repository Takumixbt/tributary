/*
 * Spec-sheet chrome. Zone: src/pages/landing/**.
 *
 * A hairline-ruled section with a Martian Mono number that sticks while the
 * section owns the viewport. Section numbers are the page's wayfinding, so they
 * never change size and never move to a different column.
 */

import type { ReactNode, Ref } from "react";
import { padCount } from "../../lib/format";

export interface SectionFrameProps {
  index: number;
  label: string;
  children: ReactNode;
  /** "split" puts prose and live data side by side. "stack" runs full width. */
  variant?: "split" | "stack";
  /** Anchor setter from useGraphAnchor, so the graph can terminate an edge here. */
  anchorRef?: Ref<HTMLElement>;
  /** Inverted editorial surface. Punctuation: the page allows this twice. */
  surface?: "paper";
  className?: string;
}

export function SectionFrame({
  index,
  label,
  children,
  variant = "split",
  anchorRef,
  surface,
  className,
}: SectionFrameProps) {
  return (
    <section
      ref={anchorRef}
      data-surface={surface}
      className={`sec${className ? " " + className : ""}`}
    >
      <div className="sec-index">
        <span className="sec-num">{padCount(index, 2)}</span>
        <span className="spec">{label}</span>
      </div>
      <div className={`sec-body${variant === "stack" ? " is-stack" : ""}`}>{children}</div>
    </section>
  );
}

export default SectionFrame;
