/*
 * The split ticker. Zone: src/dashboard/**.
 *
 * One row per flush, animating the moment itself: the total arrives, then a hard
 * 1px divider slides across the bar to the split ratio and leaves a vault share
 * and an agent share behind it. This is the product thesis in a three-column
 * panel, so the claim stays legible even when the graph is off screen.
 *
 * When a line has cleared the share is zero and the row says so: the agent keeps
 * every cent. That row is worth as much as the others, because it is the proof
 * that the rail lets go.
 */

import { useEventTape } from "../data";
import { formatBps, formatClock } from "../lib/format";
import { ANCHORS } from "../lib/stage";
import { isKind, type SplitEvent } from "../lib/types";
import { useGraphAnchor } from "../graph";
import { Amount, PanelHead, Waiting, useAgentLabels } from "./parts";
import "./dashboard.css";

const ROWS = 7;

export function SplitTicker() {
  const anchor = useGraphAnchor(ANCHORS.splitTicker, "router", "left");
  const events = useEventTape(["split"], ROWS);
  const label = useAgentLabels();
  const splits = events.filter((event): event is SplitEvent => isKind(event, "split"));

  return (
    <div ref={anchor}>
      <PanelHead title="Split on receipt" note="Vault / agent" />

      {splits.length === 0 ? (
        <Waiting>waiting for the first flush</Waiting>
      ) : (
        <ul className="split-list">
          {splits.map((split) => {
            const share = split.repaymentBps / 100;
            return (
              <li key={split.id} className="split-row" style={{ ["--split" as string]: `${share}%` }}>
                <div className="split-meta">
                  <span className="tape-time">{formatClock(split.at).slice(0, 8)}</span>
                  <span className="split-agent">{label(split.agent)}</span>
                  <span className="split-total">
                    <Amount value={split.total} />
                  </span>
                </div>

                <div className="split-bar" aria-hidden="true">
                  <span className="split-vault" />
                  <span className="split-divider" />
                </div>

                {split.repaymentBps > 0 ? (
                  <div className="split-legs">
                    <span className="split-leg" data-side="vault">
                      <span className="split-leg-label">Vault {formatBps(split.repaymentBps)}</span>
                      <Amount value={split.toVault} />
                    </span>
                    <span className="split-leg" data-side="agent">
                      <span className="split-leg-label">
                        Agent {formatBps(10_000 - split.repaymentBps)}
                      </span>
                      <Amount value={split.toAgent} />
                    </span>
                  </div>
                ) : (
                  <div className="split-legs">
                    <span className="split-pass">Debt clear, full passthrough</span>
                    <span className="split-leg" data-side="agent">
                      <span className="split-leg-label">Agent 100%</span>
                      <Amount value={split.toAgent} />
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SplitTicker;
