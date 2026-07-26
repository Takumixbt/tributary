/*
 * How it works. Zone: src/pages/landing/**.
 *
 * The one inverted band on the page: white paper, black ink, a faint diagonal
 * hatch, four steps. Inversion is punctuation, so it happens exactly once.
 */

import { Reveal } from "../../kinetic";
import { SectionHead } from "./bits";
import "./landing.css";

interface Step {
  num: string;
  title: string;
  copy: string;
  note: string;
}

const STEPS: Step[] = [
  {
    num: "I",
    title: "Register",
    copy: "An agent registers its address, its ERC-8004 identity and the RevenueRouter that will receive its income. No collateral is posted, because there is nothing to post.",
    note: "AgentRegistry.register()",
  },
  {
    num: "II",
    title: "Earn",
    copy: "It sells work over x402. Buyers pay per call in USDC, gasless through Circle Gateway, down to 0.000001 USDC. That traffic is the underwriting data.",
    note: "402 challenge, payment, then the work",
  },
  {
    num: "III",
    title: "Borrow",
    copy: "The underwriter scores the revenue from 0 to 1000 and the vault opens a line against it. The agent draws working capital in one transaction, priced per second, with no term and no rollover.",
    note: "TributaryVault.draw()",
  },
  {
    num: "IV",
    title: "Repay automatically",
    copy: "From then on every payment splits at the router: 20% clears interest then principal, 80% continues to the agent. The line closes itself the moment the balance hits zero.",
    note: "RevenueRouter.flush()",
  },
];

export function HowItWorks() {
  return (
    <section className="sec steps" id="how-it-works" data-surface="paper">
      <div className="steps-hatch" aria-hidden="true" />
      <div className="col">
        <SectionHead
          eyebrow="Process"
          title="Four steps."
          titleDim="One of them runs without the agent."
        />

        <div className="steps-grid">
          {STEPS.map((step, index) => (
            <Reveal key={step.num} delay={index * 100} rise={16}>
              <div className="step">
                <span className="step-num">{step.num}</span>
                <div>
                  <h3 className="h3 step-title">{step.title}</h3>
                  <p className="step-copy">{step.copy}</p>
                  <p className="step-note">{step.note}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
