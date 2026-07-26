/*
 * The numbers. Zone: src/pages/landing/**.
 *
 * Four figures in a hairline grid, counting up once when they arrive, exactly
 * as the reference does it.
 *
 * Every figure here is a real one, taken from the run of the loop that is on
 * Arc testnet. Nothing on this page reads the demo simulator, and nothing on
 * this page is aspirational. If a number cannot be opened in a block explorer
 * it does not belong in this section.
 *
 * The count-up commits at most one render every 60ms for the 1.4s it lasts and
 * then stops. Nothing here runs a loop after that.
 */

import { useEffect, useRef, useState } from "react";
import { Odometer, Reveal, useTick } from "../../kinetic";
import { SectionHead } from "./bits";
import "./landing.css";

const RAMP_MS = 1400;
const COMMIT_MS = 60;

/** True once the element has been on screen, then true forever. */
function useSeen<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (!record.isIntersecting) continue;
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, seen };
}

/** Zero to `target` over 1.4s once `active`, then it holds the real figure. */
function useCountUp(target: number, active: boolean): number {
  const [shown, setShown] = useState(0);
  const elapsed = useRef(0);
  const lastCommit = useRef(0);
  const done = useRef(false);

  useTick((dt, now) => {
    if (!active || done.current) return;
    elapsed.current += dt;
    const t = Math.min(1, elapsed.current / RAMP_MS);
    // Ease out cubic: fast at the start, settles on the real figure.
    const eased = 1 - Math.pow(1 - t, 3);
    if (t >= 1) {
      done.current = true;
      setShown(target);
      return;
    }
    if (now - lastCommit.current < COMMIT_MS) return;
    lastCommit.current = now;
    setShown(target * eased);
  });

  return done.current ? target : shown;
}

interface Figure {
  value: number;
  decimals: number;
  unit?: string;
  caption: string;
  note: string;
  label: string;
}

const FIGURES: Figure[] = [
  {
    value: 30,
    decimals: 0,
    caption: "Payments settled on Arc testnet",
    note: "One run of the loop, start to finish",
    label: "30 payments settled on Arc testnet",
  },
  {
    value: 0.15,
    decimals: 4,
    unit: "USDC",
    caption: "Borrowed against that history",
    note: "Line opened at a score of 139, priced at 22.22% APR",
    label: "0.15 USDC borrowed",
  },
  {
    value: 0.0393,
    decimals: 4,
    unit: "USDC",
    caption: "Came back on the very next payment",
    note: "No reminder, no signature, no grace period",
    label: "0.0393 USDC repaid automatically",
  },
  {
    value: 268,
    decimals: 0,
    unit: "/ 1000",
    caption: "Score once the cycle closed",
    note: "Up from 139, and the rate fell to 19.64%",
    label: "Score of 268 out of 1000 after the cycle",
  },
];

function Cell({ figure, active, delay }: { figure: Figure; active: boolean; delay: number }) {
  const shown = useCountUp(figure.value, active);

  return (
    <Reveal className="num-cell" delay={delay} rise={24}>
      <div className="num-figure">
        <Odometer value={shown} decimals={figure.decimals} label={figure.label} />
        {figure.unit ? <span className="num-unit-lg">{figure.unit}</span> : null}
      </div>
      <p className="num-caption">{figure.caption}</p>
      <p className="num-note">{figure.note}</p>
    </Reveal>
  );
}

export function Numbers() {
  const { ref, seen } = useSeen<HTMLDivElement>();

  return (
    <section className="sec sec-rule sec-rule-b" id="numbers">
      <div className="col" ref={ref}>
        <SectionHead
          eyebrow="Already proven"
          title="The numbers"
          titleDim="we can show you."
          aside={<span className="spec">Arc testnet</span>}
        />

        <div className="nums-grid">
          {FIGURES.map((figure, index) => (
            <Cell key={figure.caption} figure={figure} active={seen} delay={index * 100} />
          ))}
        </div>

        <p className="nums-foot">
          These are not projections. They are one credit line opening, drawing, repaying itself out
          of the next payment, and being re-scored, on a public test network. The contracts that did
          it are listed further down.
        </p>
      </div>
    </section>
  );
}

export default Numbers;
