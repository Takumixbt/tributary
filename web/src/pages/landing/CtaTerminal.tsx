/*
 * Follow the wire. Zone: src/pages/landing/**.
 *
 * The last connector in the circuit terminates here, so opening the terminal
 * feels like following the money rather than clicking a button. One primary
 * action, a live readout above it, nothing else competing.
 */

import { Link } from "react-router-dom";
import { useEventPulse, useStats } from "../../data";
import { useGraphAnchor } from "../../graph";
import { BorderCurrent } from "../../kinetic";
import { formatUsdc, padCount } from "../../lib/format";
import { ANCHORS } from "../../lib/stage";

export function CtaTerminal() {
  const anchor = useGraphAnchor(ANCHORS.ctaTerminal, "vault", "top");
  const stats = useStats();
  const repayPulse = useEventPulse(["repay", "split"]);

  return (
    <section className="cta" ref={anchor}>
      <BorderCurrent trigger={repayPulse} duration={900} />
      <span className="spec">Live loan book</span>
      <h2 className="h1">Watch the split happen</h2>
      <div className="cta-readout">
        <span>
          <span className="cta-readout-label">PAYMENTS</span>
          {padCount(stats.paymentsTotal, 4)}
        </span>
        <span>
          <span className="cta-readout-label">SPLITS</span>
          {padCount(stats.splitsTotal, 3)}
        </span>
        <span>
          <span className="cta-readout-label">ROUTED TO VAULT</span>
          {formatUsdc(stats.routedToVault)} USDC
        </span>
      </div>
      <Link to="/app" className="btn btn-primary">
        Open terminal
      </Link>
    </section>
  );
}

export default CtaTerminal;
