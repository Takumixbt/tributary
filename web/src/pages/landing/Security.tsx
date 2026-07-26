/*
 * The risk. Zone: src/pages/landing/**.
 *
 * The reference's security block, copied: a very slightly lifted surface, a
 * two-column split, the head and the tags on the left, a stack of bordered
 * cards on the right, each one an icon frame beside a short title and a
 * paragraph.
 *
 * The attack is stated before anyone has to ask for it, and then priced. A page
 * that names its own failure mode is trusted more than one that does not.
 */

import type { ReactNode } from "react";
import { Reveal } from "../../kinetic";
import { Eyebrow } from "./bits";
import "./landing.css";

const TAGS = [
  "No collateral",
  "Small first loans",
  "The score follows the agent",
  "The income is visible",
  "Cut off in seconds",
];

interface Card {
  title: string;
  copy: string;
  mark: "one" | "two" | "three" | "four";
}

const CARDS: Card[] = [
  {
    mark: "one",
    title: "A first loan is small",
    copy: "It is worth less than the income the agent already sends through us. Running off with it buys a few hours of compute. Limits only grow with a repayment record, so by the time the money is worth taking, taking it is the worse deal.",
  },
  {
    mark: "two",
    title: "The score is the collateral",
    copy: "It is attached to an identity the agent spent real income building, and the next lender reads the same history. Defaulting throws that away. Agents that plan to keep selling are the ones that come to us.",
  },
  {
    mark: "three",
    title: "We can see the money stop",
    copy: "We compare what an agent is being paid against what actually reaches the contract. The second those two stop matching, the line is cut and nothing more can be drawn.",
  },
  {
    mark: "four",
    title: "Nobody has to be trusted",
    copy: "The split is written into the contract that receives the money. It is not a promise the agent makes, and it is not a job somebody has to remember to run.",
  },
];

const MARKS: Record<Card["mark"], ReactNode> = {
  one: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="14" width="4" height="7" />
      <rect x="10" y="9" width="4" height="12" />
      <rect x="17" y="4" width="4" height="17" />
    </svg>
  ),
  two: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  ),
  three: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2.5 12a10.5 8 0 0 1 19 0 10.5 8 0 0 1-19 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  four: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  ),
};

export function Security() {
  return (
    <section className="sec risk" id="risk">
      <div className="col">
        <div className="risk-grid">
          <Reveal rise={24}>
            <Eyebrow>The risk</Eyebrow>
            <h2 className="h2 sec-title">
              Nothing is pledged.
              <br />
              <span className="dim">So we price the risk instead.</span>
            </h2>
            <p className="risk-lead">
              Here is the obvious attack. An agent borrows, then sends its earnings somewhere else,
              so nothing ever reaches the contract that was meant to repay us. There is no
              collateral to seize and nobody to sue. We do not claim to prevent that. We make it a
              bad trade, four ways.
            </p>
            <div className="tags">
              {TAGS.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </Reveal>

          <div className="risk-cards">
            {CARDS.map((card, index) => (
              <Reveal key={card.title} className="risk-card" delay={index * 100} rise={16}>
                <span className="risk-mark" aria-hidden="true">
                  {MARKS[card.mark]}
                </span>
                <div>
                  <h3 className="risk-title">{card.title}</h3>
                  <p className="risk-copy">{card.copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Security;
