/*
 * The instrument reading. Zone: src/pages/landing/**.
 *
 * Four rolling counters driven by the same event tick, so the page feels like
 * one machine: total assets, payments per minute, active agents, average score.
 * Every value is an Odometer with tabular numerals. Nothing here is decorative,
 * and every cell carries a second figure so the strip reads as a readout rather
 * than as four big numbers.
 */

import type { ReactNode } from "react";
import { useStats, useVaultState } from "../../data";
import { useGraphAnchor } from "../../graph";
import { Odometer } from "../../kinetic";
import { formatUsdc, padCount, toUsdcNumber } from "../../lib/format";
import { ANCHORS } from "../../lib/stage";

function Metric({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return (
    <div className="hero-metric">
      <span className="spec">{label}</span>
      <span className="hero-metric-value">{value}</span>
      <span className="hero-metric-note">{note}</span>
    </div>
  );
}

export function MetricStrip() {
  const anchor = useGraphAnchor(ANCHORS.heroMetrics, "vault", "top");
  const vault = useVaultState();
  const stats = useStats();

  return (
    <div className="hero-metrics" ref={anchor}>
      <Metric
        label="Vault assets"
        value={
          <Odometer value={toUsdcNumber(vault.totalAssets)} decimals={2} suffix="USDC" />
        }
        note={`Available ${formatUsdc(vault.availableLiquidity)} USDC`}
      />
      <Metric
        label="Payments / min"
        value={<Odometer value={stats.paymentsPerMin} decimals={2} />}
        note={`Smallest ${formatUsdc(stats.smallestPayment, { decimals: 6 })} USDC`}
      />
      <Metric
        label="Active agents"
        value={<Odometer value={stats.activeAgents} decimals={0} pad={3} />}
        note={`Payments ${padCount(stats.paymentsTotal, 4)}`}
      />
      <Metric
        label="Average score"
        value={<Odometer value={stats.avgScore} decimals={0} pad={3} />}
        note={`To vault ${formatUsdc(stats.routedToVault)} USDC`}
      />
    </div>
  );
}

export default MetricStrip;
