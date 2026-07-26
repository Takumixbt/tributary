/*
 * Debt against limit. Zone: src/dashboard/**.
 *
 * A hairline track with a solid fill, the outstanding amount above it and the
 * headroom below. The old barber-pole hatch is gone: the width change carries
 * the repayment on its own, over one soft transition.
 */

import { formatBps, formatUsdc } from "../lib/format";
import "./dashboard.css";

export interface DebtBarProps {
  /** Micro-USDC as a plain number. */
  debt: number;
  limit: number;
  /** Accepted for call-site compatibility. Nothing pulses any more. */
  activity?: number;
  label?: string;
  /** Share of every incoming payment routed to the vault. */
  repaymentBps?: number;
}

export function DebtBar({ debt, limit, label = "Outstanding", repaymentBps }: DebtBarProps) {
  const headroom = Math.max(0, limit - debt);
  const outstanding = BigInt(Math.max(0, Math.round(debt)));
  const available = BigInt(Math.round(headroom));
  const pct = limit > 0 ? Math.max(0, Math.min(100, (debt / limit) * 100)) : 0;

  return (
    <div className="bar-block">
      <div className="bar-head">
        <span className="stat-label">{label}</span>
        <span className="stat-value">
          {formatUsdc(outstanding)}
          <span className="num-unit">USDC</span>
        </span>
      </div>
      <div
        className="bar"
        role="img"
        aria-label={`${formatUsdc(outstanding)} USDC outstanding against a ${formatUsdc(BigInt(Math.round(limit)))} USDC line`}
      >
        <span className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="bar-foot">
        <span className="stat-note">{formatUsdc(available)} USDC headroom</span>
        {repaymentBps !== undefined ? (
          <span className="stat-note">
            {repaymentBps > 0 ? `${formatBps(repaymentBps)} of every payment` : "full passthrough"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default DebtBar;
