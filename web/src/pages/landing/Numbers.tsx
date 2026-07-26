/*
 * The numbers that matter. Zone: src/pages/landing/**.
 *
 * Four figures in a hairline grid. Each one counts up from zero the first time
 * it enters the viewport and then tracks the live stream, so the band is a
 * reading of the running economy rather than a poster.
 *
 * The count-up commits at most one render every 60ms for the 1.4s it lasts and
 * then stops. Nothing here runs a loop after that except the clock, which ticks
 * once a second.
 */

import { useEffect, useRef, useState } from "react";
import { Odometer, Reveal, useTick } from "../../kinetic";
import { useStats, useVaultState } from "../../data";
import { formatUsdc, toUsdcNumber } from "../../lib/format";
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

/** Zero to `target` over 1.4s once `active`, then the live value from then on. */
function useCountUp(target: number, active: boolean): number {
  const [shown, setShown] = useState(0);
  const elapsed = useRef(0);
  const lastCommit = useRef(0);
  const done = useRef(false);
  const targetRef = useRef(target);
  targetRef.current = target;

  useTick((dt, now) => {
    if (!active || done.current) return;
    elapsed.current += dt;
    const t = Math.min(1, elapsed.current / RAMP_MS);
    // Ease out cubic: fast at the start, settles on the real figure.
    const eased = 1 - Math.pow(1 - t, 3);
    if (t >= 1) {
      done.current = true;
      setShown(targetRef.current);
      return;
    }
    if (now - lastCommit.current < COMMIT_MS) return;
    lastCommit.current = now;
    setShown(targetRef.current * eased);
  });

  return done.current ? target : shown;
}

function Figure({
  value,
  decimals,
  unit,
  caption,
  note,
  label,
  active,
  delay,
}: {
  value: number;
  decimals: number;
  unit?: string;
  caption: string;
  note: string;
  label: string;
  active: boolean;
  delay: number;
}) {
  const shown = useCountUp(value, active);

  return (
    <Reveal className="num-cell" delay={delay} rise={24}>
      <div className="num-figure">
        <Odometer value={shown} decimals={decimals} label={label} />
        {unit ? <span className="num-unit-lg">{unit}</span> : null}
      </div>
      <p className="num-caption">{caption}</p>
      <p className="num-note">{note}</p>
    </Reveal>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useTick(() => {
    setNow((current) => {
      const next = new Date();
      return next.getSeconds() === current.getSeconds() ? current : next;
    });
  });

  return (
    <div className="nums-live">
      <span className="nums-dot" aria-hidden="true" />
      Live
      <span className="nums-sep" aria-hidden="true">
        |
      </span>
      <span>{now.toLocaleTimeString()}</span>
    </div>
  );
}

export function Numbers() {
  const { ref, seen } = useSeen<HTMLDivElement>();
  const vault = useVaultState();
  const stats = useStats();

  return (
    <section className="sec sec-rule sec-rule-b" id="numbers">
      <div className="col" ref={ref}>
        <SectionHead
          eyebrow="Live readings"
          title="The numbers"
          titleDim="that matter."
          aside={<Clock />}
        />

        <div className="nums-grid">
          <Figure
            value={toUsdcNumber(vault.totalAssets)}
            decimals={2}
            unit="USDC"
            caption="Lender capital in the vault"
            note={`${formatUsdc(vault.availableLiquidity)} USDC available to draw right now`}
            label={`${formatUsdc(vault.totalAssets)} USDC of vault assets`}
            active={seen}
            delay={0}
          />
          <Figure
            value={stats.paymentsTotal}
            decimals={0}
            caption="Nanopayments settled"
            note="Every one of them underwriting data"
            label={`${stats.paymentsTotal} nanopayments settled`}
            active={seen}
            delay={100}
          />
          <Figure
            value={stats.avgScore}
            decimals={0}
            unit="/ 1000"
            caption="Mean credit score across the roster"
            note="Posted onchain by the underwriter, with reasons"
            label={`Mean credit score ${stats.avgScore} of 1000`}
            active={seen}
            delay={200}
          />
          <Figure
            value={20}
            decimals={0}
            unit="%"
            caption="Of every payment, while debt is open"
            note="Falls to zero the moment a line clears"
            label="20 percent repayment share"
            active={seen}
            delay={300}
          />
        </div>
      </div>
    </section>
  );
}

export default Numbers;
