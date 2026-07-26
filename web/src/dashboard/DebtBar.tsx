/*
 * Debt against limit. Zone: src/dashboard/**.
 *
 * Wraps the kinetic HatchBar in the roster's units and labels it honestly:
 * outstanding debt, remaining headroom, and the share currently being taken out
 * of every payment. The bar drains right to left as principal clears, so
 * repayment is something you watch rather than something you read.
 */

import { HatchBar } from "../kinetic";
import { formatBps, formatUsdc } from "../lib/format";
import "./dashboard.css";

export interface DebtBarProps {
  /** Micro-USDC as a plain number. */
  debt: number;
  limit: number;
  /** Bump on each repayment to speed the barber pole briefly. */
  activity?: number;
  label?: string;
  /** Share of every incoming payment routed to the vault. */
  repaymentBps?: number;
}

export function DebtBar({ debt, limit, activity, label = "Outstanding", repaymentBps }: DebtBarProps) {
  const headroom = Math.max(0, limit - debt);
  const outstanding = BigInt(Math.max(0, Math.round(debt)));
  const available = BigInt(Math.round(headroom));

  return (
    <div className="stack">
      <div className="vault-util-head">
        <span className="stat-label">{label}</span>
        <span className="stat-value">
          {formatUsdc(outstanding)}
          <span className="num-unit">USDC</span>
        </span>
      </div>
      <HatchBar
        value={debt}
        max={Math.max(1, limit)}
        mode="drain"
        activity={activity}
        height={12}
        label={`${formatUsdc(outstanding)} USDC outstanding against a ${formatUsdc(BigInt(Math.round(limit)))} USDC line`}
      />
      <div className="vault-util-head debt-foot">
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
