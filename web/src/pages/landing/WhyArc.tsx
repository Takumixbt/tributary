/*
 * Why this only works on Arc. Zone: src/pages/landing/**.
 *
 * Four flat claims, no hedging, set as a hairline-gapped grid: USDC is gas so the
 * whole credit lifecycle stays in one asset; sub-second finality makes real-time
 * throttling real; gasless nanopayments are what generate the underwriting data;
 * ERC-8004 identity makes the reputation worth more than the loan.
 */

import { Reveal } from "../../kinetic";
import { SectionFrame } from "./SectionFrame";

const CLAIMS: Array<{ label: string; body: string }> = [
  {
    label: "USDC is gas",
    body: "Deposit, draw, split and repay all settle in the asset the loan is denominated in. There is no second token to hold and no gas price to hedge.",
  },
  {
    label: "Sub-second finality",
    body: "A credit line can be throttled inside a block. A bad signal costs one payment instead of one day of exposure.",
  },
  {
    label: "Gasless nanopayments",
    body: "Circle Gateway sponsors the transfer, so a 0.0002 USDC call is worth making. That traffic is the underwriting data.",
  },
  {
    label: "ERC-8004 identity",
    body: "The score attaches to a portable identity that took real revenue to build, which makes the reputation worth more than the loan.",
  },
];

export function WhyArc() {
  return (
    <SectionFrame index={5} label="Why Arc" variant="stack">
      <div className="sec-prose">
        <h2 className="h2">One asset, one second, one identity</h2>
        <p className="body">
          Tributary is not a generic lending pool with an agent theme. Each of these four
          properties is load bearing, and removing any one of them breaks the loop.
        </p>
      </div>
      <Reveal>
        <div className="claims">
          {CLAIMS.map((claim) => (
            <div className="claim" key={claim.label}>
              <span className="spec-strong">{claim.label}</span>
              <p className="claim-body">{claim.body}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </SectionFrame>
  );
}

export default WhyArc;
