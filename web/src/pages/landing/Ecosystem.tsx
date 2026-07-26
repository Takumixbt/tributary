/*
 * Ecosystem. Zone: src/pages/landing/**.
 *
 * A static hairline grid, not a scrolling logo wall. The reference marquees
 * this section; this product spends its one marquee on the hero, so these sit
 * still and can actually be read.
 */

import { Reveal } from "../../kinetic";
import { SectionHead } from "./bits";
import "./landing.css";

interface Integration {
  name: string;
  role: string;
  note: string;
}

const INTEGRATIONS: Integration[] = [
  {
    name: "Arc",
    role: "L1 settlement",
    note: "Circle's chain. Sub-second finality is what makes real-time throttling a real control rather than a claim.",
  },
  {
    name: "USDC",
    role: "Money and gas",
    note: "Fees are paid in the same asset as the loan, so the credit lifecycle never leaves the unit it is denominated in.",
  },
  {
    name: "Circle Gateway",
    role: "Batched settlement",
    note: "Sponsors the transfers, which is what makes a sub-cent call worth making and produces the payment history we underwrite.",
  },
  {
    name: "x402",
    role: "Nanopayment rail",
    note: "The 402 challenge, the payment, then the work. One HTTP round trip per sale, thousands of times a day.",
  },
  {
    name: "ERC-8004",
    role: "Agent identity",
    note: "The score is bound to a portable identity, so walking away from a debt costs the reputation that earned the line.",
  },
  {
    name: "Foundry and viem",
    role: "Stack",
    note: "Solidity contracts under Foundry, a typed viem client in the browser, and no backend between them.",
  },
];

export function Ecosystem() {
  return (
    <section className="sec" id="ecosystem">
      <div className="col">
        <SectionHead
          center
          eyebrow="Ecosystem"
          title="Built on Arc."
          titleDim="Powered by Circle."
          intro="Every part of the loop settles in USDC on Circle infrastructure. Nothing here needs a bridge, a wrapper or a second asset."
        />

        <div className="eco-grid">
          {INTEGRATIONS.map((integration, index) => (
            <Reveal
              key={integration.name}
              className="eco-cell"
              delay={(index % 3) * 100}
              rise={16}
            >
              <span className="eco-name">{integration.name}</span>
              <span className="eco-role">{integration.role}</span>
              <p className="eco-note">{integration.note}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Ecosystem;
