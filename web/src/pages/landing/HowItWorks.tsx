/*
 * How it works. Zone: src/pages/landing/**.
 *
 * The one inverted band on the page, built exactly the way the reference builds
 * its own: the same container, the same section padding, the same head, the
 * same two-column split with a stack of hairline-separated steps on the left
 * and one sticky bordered frame on the right. Only the two colour aliases flip.
 *
 * No texture, no overlay, no entrance trick. It has to read as the same
 * document with the lights on, not as a second website.
 *
 * The frame on the right is the run of the loop that is already on chain. Every
 * figure in it is real.
 */

import { Reveal } from "../../kinetic";
import { SectionHead } from "./bits";
import "./landing.css";

interface Step {
  num: string;
  title: string;
  copy: string;
}

const STEPS: Step[] = [
  {
    num: "I",
    title: "Sign up",
    copy: "An agent points its earnings at a Tributary contract and says who it is. Nothing is put up as collateral, because an agent has nothing to put up.",
  },
  {
    num: "II",
    title: "Get paid",
    copy: "It sells its work and gets paid per request, in USDC, in amounts as small as a millionth of a dollar. Every one of those payments is a data point about whether it can be lent to.",
  },
  {
    num: "III",
    title: "Borrow",
    copy: "Once there is enough history a score comes out, and a credit line opens against it. The agent draws what it needs in one transaction. Interest is charged by the second and there is no end date to roll over.",
  },
  {
    num: "IV",
    title: "It pays itself back",
    copy: "From then on every payment splits on the way in: part clears the interest and the loan, the rest goes to the agent. The loan closes itself the moment the balance reaches zero.",
  },
];

/** The proven cycle, as it actually happened on Arc testnet. */
const TRACE: Array<[string, string]> = [
  ["payments settled", "30"],
  ["line opened at score", "139"],
  ["priced at", "22.22% APR"],
  ["drawn", "0.150000 USDC"],
  ["repaid on the next payment", "0.039300 USDC"],
  ["re-scored", "268"],
  ["repriced at", "19.64% APR"],
];

export function HowItWorks() {
  return (
    <section className="sec steps" id="how-it-works" data-surface="paper">
      <div className="col">
        <SectionHead
          eyebrow="How it works"
          title="Four steps."
          titleDim="One of them runs without the agent."
        />

        <div className="steps-grid">
          <div className="steps-list">
            {STEPS.map((step, index) => (
              <Reveal key={step.num} delay={index * 100} rise={16}>
                <div className="step">
                  <span className="step-num">{step.num}</span>
                  <div>
                    <h3 className="h3 step-title">{step.title}</h3>
                    <p className="step-copy">{step.copy}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="steps-aside" delay={200} rise={16}>
            <div className="frame">
              <div className="frame-bar">
                <span className="frame-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="frame-name">one-cycle.log</span>
              </div>
              <div className="frame-body">
                {TRACE.map(([label, value], index) => (
                  <div className="frame-line" key={label}>
                    <span className="frame-index" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span className="frame-label">{label}</span>
                    <span className="frame-value">{value}</span>
                  </div>
                ))}
              </div>
              <div className="frame-foot">
                <span className="frame-dot" aria-hidden="true" />
                <span className="frame-name">Arc testnet</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
