/*
 * The agent under the lens. Zone: src/dashboard/**.
 *
 * Identity, the score, the line's terms, the debt drain, and the underwriter's
 * latest reason in its own words. Every figure here is the same figure the
 * roster row shows, so clicking a row and reading this panel can never
 * disagree.
 */

import { Sparkline } from "../kinetic";
import { useFeaturedAgent } from "../data";
import {
  formatAgo,
  formatBps,
  formatRate,
  formatUsdc,
  shortAddress,
} from "../lib/format";
import { DebtBar } from "./DebtBar";
import { ScoreDial } from "./ScoreDial";
import { StatTile } from "./StatTile";
import { PanelHead, Waiting, useSeconds } from "./parts";
import "./dashboard.css";

const HEALTH_NOTE: Record<string, string> = {
  healthy: "Current",
  throttled: "Throttled",
  delinquent: "Flagged",
};

export function FeaturedAgent() {
  const agent = useFeaturedAgent();
  const second = useSeconds();
  const now = second * 1000;

  if (!agent) {
    return (
      <div>
        <PanelHead title="Borrower under review" note="Score 0 to 1000" />
        <Waiting>waiting for the first agent to register</Waiting>
      </div>
    );
  }

  const drawn = agent.debt > 0n ? agent.debt : 0n;

  return (
    <div>
      <PanelHead title="Borrower under review" note={HEALTH_NOTE[agent.health] ?? "Current"} />

      <div className="fa-top">
        <div className="fa-id">
          <span className="fa-label">{agent.label}</span>
          <span className="fa-service">{agent.service}</span>
          <div className="fa-meta">
            <span>{shortAddress(agent.address)}</span>
            <span>ERC-8004 {agent.erc8004Id > 0 ? agent.erc8004Id : "none"}</span>
            <span>{formatUsdc(agent.unitPrice, { decimals: 6 })} per call</span>
          </div>
          <Sparkline values={agent.revenueSeries.values} width={168} height={34} live={false} />
        </div>
        <ScoreDial score={agent.score} reason={agent.scoreReason} />
      </div>

      <div className="fa-terms">
        <StatTile label="Credit line" value={formatUsdc(agent.limit)} unit="USDC" />
        <StatTile label="APR" value={formatBps(agent.aprBps)} note="accrues per second" />
        <StatTile
          label="Repayment share"
          value={agent.repaymentBps > 0 ? formatBps(agent.repaymentBps) : "0%"}
          note={agent.repaymentBps > 0 ? "of every payment" : "nothing outstanding"}
        />
      </div>

      <div className="fa-debt">
        {/* The share is already stated in the terms grid above, so it is not
            repeated here: the bar's job is the amount and the headroom. */}
        <DebtBar debt={Number(drawn)} limit={Number(agent.limit)} />
      </div>

      <div className="fa-terms">
        <StatTile label="Revenue, trailing" value={formatUsdc(agent.revenue24h)} unit="USDC" />
        <StatTile label="Throughput" value={formatRate(agent.paymentsPerMin)} unit="per min" />
        <StatTile
          label="Debt service"
          value={formatUsdc(agent.repaidTotal)}
          unit="USDC"
          note="lifetime"
        />
      </div>

      <div className="fa-reason">
        <div className="fa-reason-label">
          <span className="stat-label">Underwriter</span>
          <span className="stat-note">
            {agent.scoredAt > 0 ? `${formatAgo(agent.scoredAt, now)} ago` : "not yet scored"}
          </span>
        </div>
        <p className="fa-reason-text">{agent.scoreReason || "awaiting the first underwriter pass"}</p>
      </div>
    </div>
  );
}

export default FeaturedAgent;
