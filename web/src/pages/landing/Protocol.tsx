/*
 * Contracts. Zone: src/pages/landing/**.
 *
 * The one section on this page where precise terms are allowed, and they are
 * kept to the three deployed addresses and the sequence of calls that proved
 * the loop. Both are checkable: the addresses open on arcscan, and the run
 * below them is what actually happened on Arc testnet.
 */

import { Reveal } from "../../kinetic";
import { DEPLOYED, explorerAddress } from "../../lib/deployment";
import { SectionHead } from "./bits";
import "./landing.css";

interface ProofRow {
  step: string;
  what: string;
  value: string;
}

const PROOF: ProofRow[] = [
  { step: "01", what: "Payments settled through RevenueRouter", value: "30 payments" },
  { step: "02", what: "Line opened by the underwriter", value: "score 139 / 22.22% APR" },
  { step: "03", what: "Agent drew working capital", value: "0.150000 USDC" },
  { step: "04", what: "Next flush repaid with nobody acting", value: "0.039300 USDC" },
  { step: "05", what: "Re-score raised the limit and cut the rate", value: "score 268 / 19.64% APR" },
];

export function Protocol() {
  return (
    <section className="sec sec-rule" id="protocol">
      <div className="col">
        <SectionHead
          eyebrow="Contracts"
          title="Live on Arc testnet."
          titleDim="Go and read it."
          intro="Three contracts. No admin key sits in the repayment path and no server decides who gets credit. These are the same addresses the dashboard reads."
        />

        <div className="proto-list">
          {DEPLOYED.map((contract, index) => (
            <Reveal key={contract.key} delay={index * 100} rise={16}>
              <a
                className="proto-row"
                href={explorerAddress(contract.address)}
                target="_blank"
                rel="noreferrer"
              >
                <span className="proto-name">{contract.name}</span>
                <span className="proto-role">{contract.role}</span>
                <span className="proto-addr">{contract.address}</span>
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal className="proof" rise={16}>
          <div className="proof-head">
            <h3 className="h3">One full cycle, already on chain</h3>
            <span className="spec">Arc testnet</span>
          </div>
          <div className="proof-table">
            {PROOF.map((row) => (
              <div className="proof-row" key={row.step}>
                <span className="proof-step">{row.step}</span>
                <span className="proof-what">{row.what}</span>
                <span className="proof-value">{row.value}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default Protocol;
