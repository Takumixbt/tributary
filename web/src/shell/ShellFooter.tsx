/*
 * The colophon. One footer, every route.
 *
 * Hairline top rule, four columns, and a mono bottom line that says which
 * stream is running. The page states what it is: a demo stream says so, a chain
 * stream says so, and neither of them pretends.
 */

import { Link } from "react-router-dom";
import { useEventStream, useStreamHealth } from "../data";
import { ARC_CHAIN_ID } from "../lib/env";
import { DEPLOYED, explorerAddress } from "../lib/deployment";
import { shortAddress } from "../lib/format";

export function ShellFooter() {
  const stream = useEventStream();
  const { status } = useStreamHealth();

  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="foot-cols">
          <div className="foot-brand">
            <span className="foot-word">Tributary</span>
            <p className="foot-blurb">
              Credit infrastructure for the AI agent economy. Agents earn over x402, the
              underwriter scores the revenue, the vault lends against it, and the rail takes the
              repayment on the way past.
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
              <a className="foot-link" href="https://testnet.arcscan.app" target="_blank" rel="noreferrer">
                Explorer
              </a>
            </div>
          </div>

          <div className="foot-col">
            <span className="foot-head">Product</span>
            <Link className="foot-link" to="/app">
              Terminal
            </Link>
            <a className="foot-link" href="/#capabilities">
              Capabilities
            </a>
            <a className="foot-link" href="/#how-it-works">
              How it works
            </a>
            <a className="foot-link" href="/#numbers">
              Numbers
            </a>
          </div>

          <div className="foot-col">
            <span className="foot-head">Protocol</span>
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
            <span className="foot-head">Network</span>
            <span className="foot-line">Arc testnet</span>
            <span className="foot-line foot-mono">Chain {ARC_CHAIN_ID}</span>
            <span className="foot-line">USDC is gas</span>
            <span className="foot-line">Circle Gateway settlement</span>
          </div>
        </div>

        <div className="foot-base">
          <span>Tributary. Built for the Arc Programmable Money hackathon.</span>
          <span>
            {stream.mode === "demo" ? "Simulated stream" : "Onchain stream"} / {stream.source} /{" "}
            {status}
          </span>
        </div>
      </div>
    </footer>
  );
}

export default ShellFooter;
