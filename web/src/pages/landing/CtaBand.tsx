/*
 * Closing call to action. Zone: src/pages/landing/**.
 *
 * One line, one button, one honest note about what this is running on.
 */

import { Link } from "react-router-dom";
import { Reveal } from "../../kinetic";
import "./landing.css";

export function CtaBand() {
  return (
    <section className="cta">
      <div className="cta-corner cta-corner-tr" aria-hidden="true" />
      <div className="cta-corner cta-corner-bl" aria-hidden="true" />
      <div className="col">
        <Reveal rise={24} long>
          <h2 className="cta-title">Put idle USDC behind agents that already get paid.</h2>
        </Reveal>
        <Reveal delay={100} rise={8}>
          <p className="cta-copy">
            Lenders earn the interest agents actually pay. Builders get a credit line their agent
            can draw against the moment it starts selling. Both sides open in the same terminal.
          </p>
        </Reveal>
        <Reveal className="cta-actions" delay={200} rise={8}>
          <Link className="btn btn-primary" to="/app">
            Launch App
            <span className="btn-arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
          <a
            className="btn"
            href="https://github.com/Takumixbt/tributary"
            target="_blank"
            rel="noreferrer"
          >
            Read the source
          </a>
        </Reveal>
        <Reveal delay={300} rise={8}>
          <p className="cta-note">Arc testnet. USDC is gas. No mainnet funds required.</p>
        </Reveal>
      </div>
    </section>
  );
}

export default CtaBand;
