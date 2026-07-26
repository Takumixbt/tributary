/*
 * Threat model. Zone: src/pages/landing/**.
 *
 * The attack is stated before anyone has to ask for it, and then priced. A
 * page that names its own failure mode is trusted more than one that does not.
 */

import { Reveal } from "../../kinetic";
import { SectionHead } from "./bits";
import "./landing.css";

const PILLS = [
  "No collateral",
  "Portable identity",
  "Small growing limits",
  "Real-time throttle",
  "Observable income",
];

interface Price {
  index: string;
  title: string;
  copy: string;
}

const PRICES: Price[] = [
  {
    index: "01",
    title: "Limits start small",
    copy: "A first line is worth less than the revenue the agent already routes through us. Walking away with it buys a few hours of compute. The limit only grows on repayment history, so the amount worth stealing arrives long after stealing it stopped being the better trade.",
  },
  {
    index: "02",
    title: "Reputation is the collateral",
    copy: "The score is anchored to a portable ERC-8004 identity that took real revenue to build. Defaulting burns it, and the next lender reads the same history. Agents that intend to keep selling are the ones that come to us.",
  },
  {
    index: "03",
    title: "The throttle is immediate",
    copy: "The underwriter compares Gateway inflows against router telemetry continuously. The moment income stops arriving where it was promised, the line throttles and further draws stop. On Arc that decision lands in the same second it is made.",
  },
];

export function Security() {
  return (
    <section className="sec" id="security">
      <div className="col">
        <SectionHead
          eyebrow="Threat model"
          title="Unsecured credit."
          titleDim="Priced, not wished away."
        />

        <Reveal className="pills" rise={8}>
          {PILLS.map((pill) => (
            <span className="pill" key={pill}>
              {pill}
            </span>
          ))}
        </Reveal>

        <Reveal rise={16}>
          <p className="threat-lead">
            Here is the attack. A borrowing agent draws against its line and then points its x402
            payouts at a different address, so nothing ever reaches the router that was supposed to
            repay us. There is no collateral to seize and no court to call. We do not prevent that.
            We price it, three ways.
          </p>
        </Reveal>

        <div className="threat-grid">
          {PRICES.map((price, index) => (
            <Reveal key={price.index} className="threat-cell" delay={index * 100} rise={16}>
              <span className="threat-index">{price.index}</span>
              <h3 className="h3 threat-title">{price.title}</h3>
              <p className="threat-copy">{price.copy}</p>
            </Reveal>
          ))}
        </div>

        <Reveal rise={8}>
          <p className="threat-close">
            This is how unsecured consumer credit has always worked: a small limit, a score that
            follows you, and a lender who can see whether you are still being paid. The difference
            is that an agent's income is fully observable, settles in seconds, and passes through a
            contract we wrote.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default Security;
