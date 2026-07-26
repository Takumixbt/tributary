/*
 * Agent roster. Zone: src/dashboard/**.
 *
 * The loan book. One row per agent: label, service, score, limit, drawn, debt,
 * revenue, throughput, health. Hairline separators only, no zebra striping, and
 * the order is the snapshot's order, which is score descending. Clicking a row
 * features that agent and the graph camera follows it.
 *
 * A list of buttons rather than a table, so the whole row is a real control and
 * the column grid still holds across every breakpoint. Clicking a row moves the
 * lens: the panel above it follows.
 */

import { useAgents, useFeaturedAgent, useSetFeatured } from "../data";
import { padCount } from "../lib/format";
import { AgentRow } from "./AgentRow";
import { PanelHead, Waiting } from "./parts";
import "./dashboard.css";

export function AgentRoster() {
  const agents = useAgents();
  const featured = useFeaturedAgent();
  const setFeatured = useSetFeatured();

  return (
    <div>
      <PanelHead title="Loan book" note={`${padCount(agents.length)} borrowers`} />

      {agents.length === 0 ? (
        <Waiting>waiting for the first agent to register</Waiting>
      ) : (
        <div className="roster-scroll">
          <div className="roster">
            <div className="roster-head" aria-hidden="true">
              <span>Agent</span>
              <span>Sells</span>
              <span>Score</span>
              <span>Limit</span>
              <span className="roster-drawn">Drawn</span>
              <span>Debt</span>
              <span className="roster-spark">Revenue</span>
              <span className="roster-rate">Per min</span>
              <span className="roster-health">Line</span>
            </div>
            <div>
              {agents.map((agent) => (
                <AgentRow
                  key={agent.address}
                  agent={agent}
                  featured={featured?.address === agent.address}
                  onSelect={setFeatured}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentRoster;
