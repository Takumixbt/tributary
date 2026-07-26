/*
 * One roster row. Zone: src/dashboard/**.
 *
 * A real button, not a clickable div: clicking it moves the lens and the graph
 * camera follows. Health is carried as form, never as hue. Throttled rows get a
 * dashed rule and drop to secondary ink; flagged rows are prefixed with a blinking
 * bang in spec mono. Kill the CSS and the health column still says it in words.
 *
 * Memoized on the agent object, so a busy stream only re-renders the rows whose
 * numbers actually moved.
 */

import { memo } from "react";
import { Sparkline } from "../kinetic";
import { formatBps, formatRate, formatScore, formatUsdc } from "../lib/format";
import type { Address, AgentState } from "../lib/types";
import { Amount, Meter } from "./parts";
import "./dashboard.css";

export interface AgentRowProps {
  agent: AgentState;
  featured?: boolean;
  onSelect?: (address: Address) => void;
}

const HEALTH_WORD: Record<AgentState["health"], string> = {
  healthy: "Current",
  throttled: "Throttled",
  delinquent: "Flagged",
};

function AgentRowBase({ agent, featured = false, onSelect }: AgentRowProps) {
  const drawn = agent.principal;

  return (
    <button
      type="button"
      className="roster-row"
      data-health={agent.health}
      aria-pressed={featured}
      onClick={() => onSelect?.(agent.address)}
    >
      <span className="roster-label">
        {agent.health === "delinquent" ? (
          <span className="roster-bang" aria-hidden="true">
            !
          </span>
        ) : null}
        {agent.label}
      </span>
      <span className="roster-service">{agent.service}</span>
      <span className="roster-score">
        <Meter score={agent.score} />
        {formatScore(agent.score)}
      </span>
      <span>{formatUsdc(agent.limit)}</span>
      <span className="roster-drawn roster-dim">{formatUsdc(drawn)}</span>
      {/* Debt to six decimals: interest accrues per second and you can watch it. */}
      <span>
        <Amount value={agent.debt} />
      </span>
      <span className="roster-spark">
        <Sparkline values={agent.revenueSeries.values} width={92} height={20} live />
      </span>
      <span className="roster-rate roster-dim">{formatRate(agent.paymentsPerMin)}</span>
      <span className="roster-health">
        {HEALTH_WORD[agent.health]}
        {agent.repaymentBps > 0 ? ` ${formatBps(agent.repaymentBps)}` : ""}
      </span>
    </button>
  );
}

export const AgentRow = memo(AgentRowBase);

export default AgentRow;
