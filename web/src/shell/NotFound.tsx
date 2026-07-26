/*
 * 404. The graph keeps running behind it and the numbers keep moving, because the
 * economy does not care that a URL was wrong. Two ways out, no apology.
 */

import { Link } from "react-router-dom";
import { useStats, useVaultState } from "../data";
import { compactUsdc, formatRate, padCount } from "../lib/format";

export function NotFound() {
  const stats = useStats();
  const vault = useVaultState();

  return (
    <section className="notfound">
      <span className="spec">Error 404</span>
      <h1 className="h2">No page at that address</h1>
      <p className="lead notfound-lead">
        Nothing is routed here. The stream behind this text is still running, so pick a direction and
        the numbers come with you.
      </p>

      <div className="notfound-readout">
        <span>
          <span className="notfound-label">Vault</span>
          {compactUsdc(vault.totalAssets)} USDC
        </span>
        <span>
          <span className="notfound-label">Payments</span>
          {formatRate(stats.paymentsPerMin)} per min
        </span>
        <span>
          <span className="notfound-label">Agents</span>
          {padCount(stats.activeAgents)}
        </span>
      </div>

      <div className="notfound-actions">
        <Link className="btn btn-primary" to="/">
          Back to overview
        </Link>
        <Link className="btn" to="/app">
          Open terminal
        </Link>
      </div>
    </section>
  );
}

export default NotFound;
