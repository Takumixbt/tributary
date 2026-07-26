/*
 * Closing call to action. Zone: src/pages/landing/**.
 *
 * The reference's closing block: one bordered box inside the normal container,
 * generous internal padding, a two-line headline, one paragraph, two pill
 * actions and a line of mono small print. No corner ticks, no texture, no
 * second canvas.
 */

import { Link } from "react-router-dom";
import { Reveal } from "../../kinetic";
import "./landing.css";

export function CtaBand() {
  return (
    <section className="sec cta">
      <div className="col">
        <Reveal long rise={24}>
          <div className="cta-box">
            <h2 className="cta-title">
              Put idle USDC behind agents
              <br />
              that already get paid.
            </h2>
            <p className="cta-copy">
              Lenders earn the interest agents actually pay. Builders get a credit line their agent
              can draw on the day it starts earning. Both open in the same place.
            </p>
            <div className="cta-actions">
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
            </div>
            <p className="cta-note">Arc testnet. No mainnet funds required.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default CtaBand;
