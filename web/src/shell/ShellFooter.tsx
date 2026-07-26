/*
 * The colophon. One footer, every route.
 *
 * The reference's structure, unchanged: a hairline top rule, a brand column
 * spanning two of six with a short line and its social links, four link
 * columns, then a bottom bar with small print at both ends. No stream status,
 * no mode banner, no cleverness.
 */

import { Link } from "react-router-dom";
import { DEPLOYED, explorerAddress } from "../lib/deployment";
import { shortAddress } from "../lib/format";

const YEAR = 2026;

export function ShellFooter() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="foot-cols">
          <div className="foot-brand">
            <span className="foot-word">Tributary</span>
            <p className="foot-blurb">
              Credit for AI agents. They earn in small payments, we lend against that income, and
              every payment they earn pays part of it back.
            </p>
            <div className="foot-social">
              <a
                className="foot-link"
                href="https://github.com/Takumixbt/tributary"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <a
                className="foot-link"
                href="https://testnet.arcscan.app"
                target="_blank"
                rel="noreferrer"
              >
                Explorer
              </a>
            </div>
          </div>

          <div className="foot-col">
            <h3 className="foot-head">Product</h3>
            <Link className="foot-link" to="/app">
              Dashboard
            </Link>
            <a className="foot-link" href="/#what-it-does">
              What it does
            </a>
            <a className="foot-link" href="/#how-it-works">
              How it works
            </a>
            <a className="foot-link" href="/#numbers">
              Numbers
            </a>
          </div>

          <div className="foot-col">
            <h3 className="foot-head">Protocol</h3>
            {DEPLOYED.map((contract) => (
              <a
                key={contract.key}
                className="foot-link foot-mono"
                href={explorerAddress(contract.address)}
                target="_blank"
                rel="noreferrer"
              >
                {contract.name} {shortAddress(contract.address, 6, 4)}
              </a>
            ))}
          </div>

          <div className="foot-col">
            <h3 className="foot-head">Network</h3>
            <a
              className="foot-link"
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noreferrer"
            >
              Arc testnet
            </a>
            <a
              className="foot-link"
              href="https://www.circle.com/usdc"
              target="_blank"
              rel="noreferrer"
            >
              USDC
            </a>
            <a
              className="foot-link"
              href="https://www.circle.com/gateway"
              target="_blank"
              rel="noreferrer"
            >
              Circle Gateway
            </a>
          </div>

          <div className="foot-col">
            <h3 className="foot-head">Build</h3>
            <a
              className="foot-link"
              href="https://github.com/Takumixbt/tributary"
              target="_blank"
              rel="noreferrer"
            >
              Source
            </a>
            <a
              className="foot-link"
              href="https://github.com/Takumixbt/tributary/tree/main/contracts"
              target="_blank"
              rel="noreferrer"
            >
              Contracts
            </a>
            <a
              className="foot-link"
              href="https://github.com/Takumixbt/tributary#readme"
              target="_blank"
              rel="noreferrer"
            >
              Readme
            </a>
          </div>
        </div>

        <div className="foot-base">
          <span>{YEAR} Tributary. Credit for agents that already get paid.</span>
          <div className="foot-base-right">
            <Link className="foot-base-mono" to="/app">
              Launch App &rarr;
            </Link>
            <span className="foot-base-mono">Arc testnet</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default ShellFooter;
