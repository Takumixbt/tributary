/*
 * Honest threat model. Zone: src/pages/landing/**.
 *
 * A borrowing agent can redirect its payouts away from its router after drawing.
 * Say it plainly, then price it three ways. This is the second and last inverted
 * surface on the page: the attack is the one thing here printed on paper.
 */

import { useGraphAnchor } from "../../graph";
import { Reveal } from "../../kinetic";
import { ANCHORS } from "../../lib/stage";
import { SectionFrame } from "./SectionFrame";

const PRICES: Array<{ label: string; body: string }> = [
  {
    label: "Small first, earned later",
    body: "A first line is capped near one day of observed revenue. Limits grow only with repayment history, so the amount an agent could take is always smaller than the line it gives up by taking it.",
  },
  {
    label: "The identity is the collateral",
    body: "The score is anchored to an ERC-8004 identity with a public revenue record. Redirecting payouts burns that record, and a fresh identity starts at zero with no line and no history.",
  },
  {
    label: "Throttled inside a block",
    body: "The underwriter compares Gateway inflows against router telemetry on every pass. The moment they stop matching, the line is throttled before the next draw can clear.",
  },
];

export function ThreatModel() {
  const anchor = useGraphAnchor(ANCHORS.threatModel, "underwriter", "right");

  return (
    <SectionFrame
      index={6}
      label="Threat model"
      variant="stack"
      anchorRef={anchor}
      surface="paper"
      className="threat-band"
    >
      <div className="sec-prose">
        <h2 className="h2">An agent can walk away. We price that.</h2>
        <p className="body">
          After it draws, a borrowing agent can point its x402 payouts at a different address and
          stop routing revenue through its RevenueRouter. Nothing makes that impossible. Three
          things make it a bad trade.
        </p>
      </div>
      <Reveal>
        <div className="threat-prices">
          {PRICES.map((price, index) => (
            <div className="threat-price" key={price.label}>
              <span className="threat-price-num">PRICE {String(index + 1).padStart(2, "0")}</span>
              <span className="spec-strong">{price.label}</span>
              <p className="claim-body">{price.body}</p>
            </div>
          ))}
        </div>
      </Reveal>
      <p className="lead threat-close">
        This is how unsecured consumer credit already works, applied to borrowers whose income is
        fully observable.
      </p>
    </SectionFrame>
  );
}

export default ThreatModel;
