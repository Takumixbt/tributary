/*
 * One step of the credit loop. Zone: src/pages/landing/**.
 *
 * Four of these run in order: 01 REVENUE, 02 SCORE, 03 CREDIT, 04 REPAYMENT.
 * Each is paired with a camera focus on the graph stage it describes, and each
 * exposes an anchor so a connector can continue from this section into the next.
 * The prose states the claim, the inset shows the live number behind it.
 */

import type { ReactNode } from "react";
import { useGraphAnchor } from "../../graph";
import { Reveal } from "../../kinetic";
import type { AnchorBind, AnchorId, AnchorSide } from "../../lib/stage";
import { SectionFrame } from "./SectionFrame";

export interface LoopSectionProps {
  index: number;
  label: string;
  title: string;
  body: string;
  /** One mono line under the paragraph: the mechanism in the product's own terms. */
  note?: string;
  anchor?: { id: AnchorId; bind: AnchorBind; side?: AnchorSide };
  children?: ReactNode;
}

export function LoopSection({ index, label, title, body, note, anchor, children }: LoopSectionProps) {
  const anchorRef = useGraphAnchor(
    anchor?.id ?? "sec-revenue",
    anchor?.bind ?? "agent",
    anchor?.side ?? "left",
  );

  return (
    <SectionFrame index={index} label={label} anchorRef={anchor ? anchorRef : undefined}>
      <div className="sec-prose">
        <h2 className="h2">{title}</h2>
        <p className="body">{body}</p>
        {note ? <p className="sec-note">{note}</p> : null}
      </div>
      {children ? <Reveal>{children}</Reveal> : null}
    </SectionFrame>
  );
}

export default LoopSection;
