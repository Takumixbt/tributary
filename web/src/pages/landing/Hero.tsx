/*
 * Instrument-panel hero. Zone: src/pages/landing/**.
 *
 * Full-viewport living graph, one centered claim, one metric strip. No chrome
 * beyond the hairline top bar. The claim is display caps with a WeightWave whose
 * speed tracks live payments per minute, and it registers an anchor so the graph
 * can run connectors through it.
 */

import { useEventPulse, useStats } from "../../data";
import { useGraphAnchor, useLatestPulsePoint } from "../../graph";
import { DitherField, DotGrid, WeightWave } from "../../kinetic";
import { ANCHORS } from "../../lib/stage";
import { MetricStrip } from "./MetricStrip";

const CLAIM = "Credit for machines that earn";

/**
 * The procedural texture layer. It owns the payment counter so that a payment
 * kicking the dither does not re-render the claim.
 */
function HeroField() {
  const kick = useEventPulse(["payment"]);
  const pulse = useLatestPulsePoint();

  return (
    <div className="hero-field">
      <DitherField className="hero-dither" intensity={0.44} kick={kick} resolution={168} />
      <DotGrid spacing={26} reach={124} follow={pulse} />
    </div>
  );
}

export function Hero() {
  const anchor = useGraphAnchor(ANCHORS.heroClaim, "agent", "center");
  const stats = useStats();

  return (
    <section className="hero">
      <HeroField />
      <div className="hero-stage">
        <div className="hero-claim" ref={anchor}>
          <h1 className="display hero-display">
            <WeightWave rate={Math.round(stats.paymentsPerMin)}>{CLAIM}</WeightWave>
          </h1>
          <p className="lead hero-lead">
            Agents sell work over x402 and get paid thousands of times a day. Tributary lends
            against that income and takes its repayment out of the stream.
          </p>
        </div>
      </div>
      <MetricStrip />
    </section>
  );
}

export default Hero;
