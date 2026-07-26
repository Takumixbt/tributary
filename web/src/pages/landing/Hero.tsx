/*
 * Hero. Zone: src/pages/landing/**.
 *
 * The reference's opening frame, beat for beat: a hairline field, a canvas off
 * the right shoulder, one eyebrow, a two-line claim whose last word arrives
 * letter by letter, one paragraph, two pill actions, and a marquee pinned to
 * the bottom edge.
 *
 * Every figure in the marquee is real. Nothing here is simulated.
 *
 * The graph is the same engine the dashboard uses, boxed and set to its calmest
 * preset: no pointer influence, no labels, and it lives inside the content
 * layer, so it passes under the nav and behind the copy.
 */

import { Link } from "react-router-dom";
import { NetworkGraph } from "../../graph";
import { Marquee, Reveal } from "../../kinetic";
import { Eyebrow } from "./bits";
import "./landing.css";

const ANIMATED_WORD = "credit";

interface Stat {
  figure: string;
  copy: string;
  tag: string;
}

/*
 * Four claims, all checkable. The first is the contract's minimum unit, the
 * second is the split written into the router, the third and fourth come from
 * the run of the loop that is already on Arc testnet.
 */
const STATS: Stat[] = [
  { figure: "$0.000001", copy: "Smallest payment", tag: "PAYMENTS" },
  { figure: "20%", copy: "Of every payment repays the loan", tag: "REPAYMENT" },
  { figure: "Live", copy: "On Arc testnet", tag: "STATUS" },
  { figure: "139 to 268", copy: "Credit score in one cycle", tag: "PROVEN" },
];

/** The one letter-by-letter animation in the product. It plays once, on load. */
function CharIn({ word }: { word: string }) {
  return (
    <span className="charin">
      <span className="charin-letters">
        {word.split("").map((letter, index) => (
          <span
            className="charin-letter"
            key={`${letter}-${index}`}
            style={{ animationDelay: `${400 + index * 50}ms` }}
          >
            {letter}
          </span>
        ))}
      </span>
      <span className="charin-bar" aria-hidden="true" />
    </span>
  );
}

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-visual" aria-hidden="true">
        <NetworkGraph mode="ambient" scene="hero" className="hero-graph" height="100%" />
      </div>

      <div className="col hero-top">
        <Reveal className="hero-eyebrow" rise={8}>
          <Eyebrow>Credit for AI agents, live on Arc testnet</Eyebrow>
        </Reveal>

        <Reveal long rise={24}>
          <h1 className="display hero-title">
            <span className="line">Small payments in.</span>
            <span className="line">
              Real <CharIn word={ANIMATED_WORD} /> out.
            </span>
          </h1>
        </Reveal>

        <div className="hero-lede">
          <Reveal delay={100} rise={8}>
            <p>
              AI agents get paid tiny amounts for the work they do, thousands of times a day.
              Tributary turns that income into a credit score and lends against it. Every payment
              an agent earns then pays a slice of the loan back on its way in, so lenders get
              repaid without anyone having to be trusted.
            </p>
          </Reveal>
        </div>

        <Reveal className="hero-actions" delay={200} rise={8}>
          <Link className="btn btn-primary" to="/app">
            Launch App
            <span className="btn-arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
          <a className="btn" href="#protocol">
            View the contracts
          </a>
        </Reveal>
      </div>

      <div className="hero-strip">
        <Marquee speed={34} label="What is true today">
          {STATS.map((stat) => (
            <span className="strip-item" key={stat.tag}>
              <span className="strip-figure">{stat.figure}</span>
              <span className="strip-copy">
                {stat.copy}
                <span className="strip-tag">{stat.tag}</span>
              </span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

export default Hero;
