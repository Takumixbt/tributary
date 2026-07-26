/*
 * Score readout. Zone: src/dashboard/**.
 *
 * Design direction v2 replaced the dithered, shimmering dial with the number
 * itself: a large mono figure, the scale it sits on, and a ten-step hairline
 * meter. A score moves a few times a minute and the change is legible without
 * anything animating, which is the whole point of the new direction.
 */

import { formatScore } from "../lib/format";
import "./dashboard.css";

export interface ScoreDialProps {
  score: number;
  /** Kept for call-site compatibility. The readout is fluid now. */
  size?: number;
  /** The underwriter's reason for this score. */
  reason?: string;
}

const STEPS = 10;

export function ScoreDial({ score, reason }: ScoreDialProps) {
  const clamped = Math.max(0, Math.min(1000, score));
  const filled = Math.round((clamped / 1000) * STEPS);
  const label = `Score ${formatScore(score)} of 1000${reason ? `. ${reason}` : ""}`;

  return (
    <div className="score" role="img" aria-label={label}>
      <span className="score-cap">Credit score</span>
      <span className="score-value">
        {formatScore(score)}
        <span className="score-scale">/ 1000</span>
      </span>
      <span className="score-meter" aria-hidden="true">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} data-on={i < filled ? 1 : 0} />
        ))}
      </span>
    </div>
  );
}

export default ScoreDial;
