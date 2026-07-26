/*
 * The terminal. Zone: src/dashboard/**.
 *
 * Same information architecture as before, dressed in design direction v2:
 * Figtree headings, Geist Mono data, hairline gaps at white/10, zero radius,
 * and space between things. Nothing on this page blinks, scrambles, shimmers
 * or scrolls by itself.
 *
 * Grid plan at 1440px and up:
 *   row 1  VaultPanel   1-5    FeaturedAgent   6-9     SplitTicker  10-12
 *   row 2  AgentRoster  1-9    UnderwriterFeed 10-12
 *   row 3  Activity     1-12   (a disclosure, closed by default)
 */

import { useState, type ReactNode } from "react";
import { useEventStream, useStats } from "../data";
import { compactUsdc, formatRate, formatUsdc, padCount } from "../lib/format";
import { AgentRoster } from "./AgentRoster";
import { EventLedger } from "./EventLedger";
import { SplitTicker } from "./SplitTicker";
import { UnderwriterFeed } from "./UnderwriterFeed";
import { VaultPanel } from "./VaultPanel";
import { FeaturedAgent } from "./FeaturedAgent";
import "./dashboard.css";

function DeskStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="desk-stat">
      <span className="stat-label">{label}</span>
      <span className="num desk-stat-value">{value}</span>
    </div>
  );
}

export function DashboardPage() {
  const stats = useStats();
  const simulated = useEventStream().mode === "demo";
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <div className="desk" data-surface="deep">
      <div className="desk-col">
        <header className="desk-head">
          <div className="desk-eyebrow">
            <span className="eyebrow">Dashboard</span>
            {simulated ? <span className="desk-sim">Simulation</span> : null}
          </div>
          <h1 className="h2 desk-title">Loan book</h1>
          <p className="desk-note">
            {simulated
              ? "A seeded simulation of the loan book, running entirely in this browser. Drop ?demo=1 from the URL to read Arc testnet instead."
              : "Every credit line on Arc testnet, priced by the second, repaid out of the money each agent earns."}
          </p>
        </header>

        <div className="desk-stats">
          <DeskStat label="Payments per min" value={formatRate(stats.paymentsPerMin)} />
          <DeskStat label="Gross volume" value={compactUsdc(stats.volumeTotal)} />
          <DeskStat
            label="Routed to vault"
            value={formatUsdc(stats.routedToVault, { decimals: 4 })}
          />
          <DeskStat label="Agents live" value={padCount(stats.activeAgents)} />
          <DeskStat label="Mean score" value={padCount(stats.avgScore)} />
          <DeskStat
            label="Smallest payment"
            value={
              stats.smallestPayment > 0n
                ? formatUsdc(stats.smallestPayment, { decimals: 6 })
                : "0.000000"
            }
          />
        </div>

        <div className="desk-grid">
          <section className="desk-cell desk-vault" aria-label="Vault">
            <VaultPanel />
          </section>
          <section className="desk-cell desk-featured" aria-label="Borrower under review">
            <FeaturedAgent />
          </section>
          <section className="desk-cell desk-ticker" aria-label="Split on receipt">
            <SplitTicker />
          </section>
          <section className="desk-cell desk-roster" aria-label="Loan book">
            <AgentRoster />
          </section>
          <section className="desk-cell desk-underwriter" aria-label="Underwriter decisions">
            <UnderwriterFeed />
          </section>
        </div>

        <section className="activity" aria-label="Activity log">
          <button
            type="button"
            className="activity-toggle"
            aria-expanded={activityOpen}
            onClick={() => setActivityOpen((open) => !open)}
          >
            <span className="activity-title">Activity</span>
            <span className="activity-meta">{padCount(stats.paymentsTotal, 6)} events settled</span>
            <span className="activity-mark" aria-hidden="true">
              {activityOpen ? "Hide" : "Show"}
            </span>
          </button>
          {activityOpen ? (
            <div className="activity-body">
              <EventLedger />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
