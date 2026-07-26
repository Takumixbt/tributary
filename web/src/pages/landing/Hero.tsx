/*
 * Hero. Zone: src/pages/landing/**.
 *
 * A tall opening frame: hairline field, the living payment graph running quiet
 * off the right shoulder, one eyebrow, a three-line claim whose last word
 * arrives letter by letter, one paragraph, two actions, and the stat strip
 * pinned to the bottom edge.
 *
 * The graph is the same engine the terminal uses, boxed and set to its calmest
 * preset: no pointer influence, no labels, pulses only when a payment actually
 * lands.
 */

import { Link } from "react-router-dom";
import { NetworkGraph } from "../../graph";
import { Marquee, Reveal } from "../../kinetic";
import { Eyebrow } from "./bits";
import "./landing.css";

const ANIMATED_WORD = "automatically";

interface Stat {
  figure: string;
  copy: string;
  tag: string;
}

const STATS: Stat[] = [
  { figure: "0.000001", copy: "USDC minimum payment", tag: "NANO" },
  { figure: "Sub-second", copy: "Finality on Arc", tag: "ARC" },
  { figure: "20 / 80", copy: "Split at the rail while debt is open", tag: "RAIL" },
  { figure: "0-1000", copy: "Credit score posted onchain", tag: "SCORE" },
  { figure: "USDC", copy: "Is the gas, so credit never leaves the asset", tag: "GAS" },
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
          <Eyebrow>Rail-enforced credit for the agent economy on Arc</Eyebrow>
        </Reveal>

        <Reveal long rise={24}>
          <h1 className="display hero-title">
            <span className="line">Credit for agents</span>
            <span className="line">that repays</span>
            <span className="line">
              <CharIn word={ANIMATED_WORD} />
            </span>
          </h1>
        </Reveal>

        <div className="hero-lede">
          <Reveal delay={100} rise={8}>
            <p>
              Agents sell work over x402 and get paid thousands of times a day. Tributary turns that
              revenue into a credit score, lends USDC against it, and takes the repayment out of
              every incoming payment at the router. Repayment is plumbing, not a promise.
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
            View Protocol
          </a>
        </Reveal>
      </div>

      <div className="hero-strip">
        <Marquee speed={34} label="Protocol facts">
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
