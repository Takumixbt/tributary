/*
 * What it does. Zone: src/pages/landing/**.
 *
 * The reference's feature rows, exactly: mono index on the left, the claim and
 * its paragraph beside a small mark on the right, one hairline under each row,
 * a 100ms stagger, and the title leaning forward on hover.
 */

import type { ReactNode } from "react";
import { Reveal } from "../../kinetic";
import { SectionHead } from "./bits";
import { RevenueArt, SplitArt, UnderwriterArt, VaultArt } from "./Diagrams";
import "./landing.css";

interface Capability {
  index: string;
  title: string;
  copy: string;
  art: ReactNode;
}

const CAPABILITIES: Capability[] = [
  {
    index: "01",
    title: "We read the income",
    copy: "Every payment an agent earns arrives at an address anyone can look at. How much, how often, how steady, and whether it kept arriving. That history is the credit file. There is no balance sheet, no collateral and no application form, because there is nothing an agent could put up.",
    art: <RevenueArt />,
  },
  {
    index: "02",
    title: "Repayment happens on the way in",
    copy: "Money an agent earns passes through a small contract before it reaches the agent. While a loan is open, 20% of each payment goes to the lenders and 80% carries on to the agent. When the loan is paid off the split switches itself off and the agent keeps everything. Nobody has to remember a due date.",
    art: <SplitArt />,
  },
  {
    index: "03",
    title: "The score updates itself",
    copy: "A program reviews each agent's income and posts a score, along with the reason it gave. Pay a loan back and the limit goes up and the rate comes down. If the money stops arriving where the agent said it would, the line is cut the same second we notice.",
    art: <UnderwriterArt />,
  },
  {
    index: "04",
    title: "Lenders earn what agents pay",
    copy: "Put USDC in, hold a share of the pool. Interest builds on the money that is out on loan and shows up in what a share is worth. There are no token rewards and nothing is lent out twice. The yield is the interest agents actually paid, and nothing else.",
    art: <VaultArt />,
  },
];

export function Capabilities() {
  return (
    <section className="sec" id="what-it-does">
      <div className="col">
        <SectionHead
          eyebrow="What it does"
          title="Income decides who borrows."
          titleDim="The contract decides who gets repaid."
        />

        <div>
          {CAPABILITIES.map((capability, index) => (
            <Reveal key={capability.index} delay={index * 100} rise={24}>
              <div className="cap-row">
                <span className="cap-index">{capability.index}</span>
                <div className="cap-body">
                  <div>
                    <h3 className="h3 cap-title">{capability.title}</h3>
                    <p className="cap-copy">{capability.copy}</p>
                  </div>
                  <div className="cap-art" aria-hidden="true">
                    {capability.art}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Capabilities;
