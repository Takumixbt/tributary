/*
 * Underwriter decision feed. Zone: src/dashboard/**.
 *
 * Decisions as sentences: what it saw, what it did, what the line looks like now.
 * OPENED, RAISED, HELD, THROTTLED and CLOSED sit in spec mono, the score move in
 * mono, the reason in body text. A feed of numbers proves nothing. A feed of
 * reasons is what makes an autonomous lender believable.
 */

import { useEventTape } from "../data";
import { formatAgo, formatScore } from "../lib/format";
import { ANCHORS } from "../lib/stage";
import { isKind, type ScoreEvent } from "../lib/types";
import { useGraphAnchor } from "../graph";
import { ACTION_LABEL } from "./describe";
import { PanelHead, Waiting, useAgentLabels, useSeconds } from "./parts";
import "./dashboard.css";

const ROWS = 8;

export function UnderwriterFeed() {
  const anchor = useGraphAnchor(ANCHORS.underwriterFeed, "underwriter", "left");
  const events = useEventTape(["score"], ROWS);
  const label = useAgentLabels();
  const now = useSeconds() * 1000;
  const decisions = events.filter((event): event is ScoreEvent => isKind(event, "score"));

  return (
    <div ref={anchor}>
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
                  {delta !== 0 ? (
                    <span className="uw-delta">
                      {delta > 0 ? "+" : ""}
                      {delta}
                    </span>
                  ) : (
                    <span className="uw-delta">no change</span>
                  )}
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
