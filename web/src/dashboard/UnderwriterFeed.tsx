/*
 * Underwriter decision feed. Zone: src/dashboard/**.
 *
 * Three rows, quiet. What it did, to whom, the score move, and the sentence
 * that justified it. A feed of numbers proves nothing. A feed of reasons is
 * what makes an autonomous lender believable, and three of them are enough:
 * the whole history is in the activity log at the bottom of the desk.
 */

import { useEventTape } from "../data";
import { formatAgo, formatScore } from "../lib/format";
import { isKind, type ScoreEvent } from "../lib/types";
import { ACTION_LABEL } from "./describe";
import { PanelHead, Waiting, useAgentLabels, useSeconds } from "./parts";
import "./dashboard.css";

const ROWS = 3;

export function UnderwriterFeed() {
  const events = useEventTape(["score"], ROWS);
  const label = useAgentLabels();
  const now = useSeconds() * 1000;
  const decisions = events.filter((event): event is ScoreEvent => isKind(event, "score"));

  return (
    <div>
      <PanelHead title="Underwriter" note="Autonomous" />

      {decisions.length === 0 ? (
        <Waiting>waiting for the first pass over the roster</Waiting>
      ) : (
        <ul className="uw-list">
          {decisions.map((decision) => {
            const delta = decision.score - decision.previousScore;
            return (
              <li key={decision.id} className="uw-row">
                <div className="uw-head">
                  <span className="uw-action">{ACTION_LABEL[decision.action] ?? "HELD"}</span>
                  <span className="uw-agent">{label(decision.agent)}</span>
                  <span className="uw-time">{formatAgo(decision.at, now)} ago</span>
                </div>
                <div className="uw-score">
                  <span>{formatScore(decision.previousScore)}</span>
                  <span aria-hidden="true">&rarr;</span>
                  <span className="uw-score-now">{formatScore(decision.score)}</span>
                  <span className="uw-delta">
                    {delta === 0 ? "no change" : `${delta > 0 ? "+" : ""}${delta}`}
                  </span>
                </div>
                <p className="uw-reason">{decision.reason}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default UnderwriterFeed;
