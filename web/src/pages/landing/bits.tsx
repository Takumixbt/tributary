/*
 * Shared landing furniture. Zone: src/pages/landing/**.
 *
 * An eyebrow and a section head, written once. Every section on this page
 * opens the same way: a 32px rule, a mono label, then a two-line headline
 * whose second line drops to secondary ink.
 */

import type { ReactNode } from "react";
import { Reveal } from "../../kinetic";
import "./landing.css";

export function Eyebrow({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <span className="eyebrow" {...(center ? { "data-center": "1" } : {})}>
      {children}
    </span>
  );
}

export interface SectionHeadProps {
  eyebrow: string;
  title: string;
  /** Second headline line. Rendered at secondary ink, as in the reference. */
  titleDim?: string;
  intro?: string;
  center?: boolean;
  /** Anything that sits on the right of the headline, like the live clock. */
  aside?: ReactNode;
}

export function SectionHead({ eyebrow, title, titleDim, intro, center, aside }: SectionHeadProps) {
  const head = (
    <div className={center ? "sec-center" : undefined}>
      <Eyebrow center={center}>{eyebrow}</Eyebrow>
      <h2 className="h2 sec-title">
        {title}
        {titleDim ? (
          <>
            <br />
            <span className="dim">{titleDim}</span>
          </>
        ) : null}
      </h2>
      {intro ? <p className="sec-intro">{intro}</p> : null}
    </div>
  );

  return (
    <Reveal className="sec-head">
      {aside ? (
        <div className="sec-head-row">
          {head}
          {aside}
        </div>
      ) : (
        head
      )}
    </Reveal>
  );
}
