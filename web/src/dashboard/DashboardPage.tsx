/*
 * Mission control. Zone: src/dashboard/**.
 *
 * A trading desk, not a marketing page: twelve columns with 1px gaps where the
 * hairline shows through, and panels on a scrim so the graph stays visible behind
 * the whole desk. No cards, no borders, no shadows, no radius. Density is the
 * aesthetic; whitespace lives on the landing page.
 *
 * Grid plan at 1440px and up:
 *   row 1  VaultPanel   1-5    FeaturedAgent   6-9     SplitTicker  10-12
 *   row 2  AgentRoster  1-9    UnderwriterFeed 10-12
 *   row 3  EventLedger  1-12
 * The persistent ledger rail is outside this page: App renders it on every route.
 */

import type { ReactNode } from "react";
import { Odometer } from "../kinetic";
import { useStats } from "../data";
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
    <div className="desk-head-stat">
      <span className="stat-label">{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}

export function DashboardPage() {
  const stats = useStats();

  return (
    <div className="desk" data-surface="deep">
      <header className="desk-head">
        <span className="spec">Terminal</span>
        <h1 className="h3">Loan book</h1>
        <p className="spec desk-head-note">
          Every credit line on Arc, priced per second, repaid by the rail
        </p>
        <div className="desk-head-stats">
          <DeskStat label="Payments per min" value={formatRate(stats.paymentsPerMin)} />
          <DeskStat label="Gross volume" value={`${compactUsdc(stats.volumeTotal)}`} />
          <DeskStat
            label="Routed to vault"
            value={
              <Odometer
                value={Number(stats.routedToVault) / 1e6}
                decimals={4}
                label={`${formatUsdc(stats.routedToVault)} USDC routed to the vault`}
              />
            }
          />
          <DeskStat label="Agents live" value={padCount(stats.activeAgents)} />
          <DeskStat label="Mean score" value={padCount(stats.avgScore)} />
          <DeskStat
            label="Smallest payment"
            value={stats.smallestPayment > 0n ? formatUsdc(stats.smallestPayment, { decimals: 6 }) : "0.000000"}
          />
        </div>
      </header>

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
        <section className="desk-cell desk-ledger" aria-label="Event ledger">
          <EventLedger />
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
