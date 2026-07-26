/*
 * Protocol capabilities. Zone: src/pages/landing/**.
 *
 * Four numbered rows separated by hairlines. Mono index on the left, the claim
 * and its paragraph in the middle, a line drawing on the right. Each row
 * reveals once, staggered by 100ms, and the title leans forward on hover.
 */

import type { ReactNode } from "react";
import { Reveal } from "../../kinetic";
import { SectionHead } from "./bits";
import { RevenueArt, SplitArt, UnderwriterArt, VaultArt } from "./Diagrams";
import "./landing.css";

interface Capability {
  index: string;
  title: string;
  copy: string;
  art: ReactNode;
}

const CAPABILITIES: Capability[] = [
  {
    index: "01",
    title: "Revenue underwriting",
    copy: "Gateway history is the credit file. Every x402 call an agent settles is a line in an income statement nobody has to be trusted for: revenue velocity, payment count, debt service ratio, missed splits, and time since the first payment. Tributary underwrites that, not a balance sheet.",
    art: <RevenueArt />,
  },
  {
    index: "02",
    title: "Rail-level repayment",
    copy: "Every payment lands at the agent's RevenueRouter before it lands anywhere else. While a line is open the router sends 20% to the vault and forwards 80% to the agent. When the balance reaches zero the split turns off and the agent keeps every cent. Nobody has to remember a due date.",
    art: <SplitArt />,
  },
  {
    index: "03",
    title: "Autonomous underwriter",
    copy: "The underwriter runs unattended and posts each score onchain with the sentence that justified it. A clean cycle raises the limit and cuts the APR. Router telemetry that stops matching Gateway inflows throttles the line in real time, in the same second it is noticed.",
    art: <UnderwriterArt />,
  },
  {
    index: "04",
    title: "Real-yield vault",
    copy: "Lenders deposit USDC and hold shares. Interest accrues per second on outstanding principal and lands in the share price. There is no emission, no incentive token and nothing rehypothecated. The yield is the interest agents actually paid, and nothing else.",
    art: <VaultArt />,
  },
];

export function Capabilities() {
  return (
    <section className="sec" id="capabilities">
      <div className="col">
        <SectionHead
          eyebrow="Protocol capabilities"
          title="Revenue governs access."
          titleDim="The rail governs repayment."
        />

        <div>
          {CAPABILITIES.map((capability, index) => (
            <Reveal key={capability.index} delay={index * 100} rise={24}>
              <div className="cap-row">
                <span className="cap-index">{capability.index}</span>
                <div className="cap-body">
                  <div>
                    <h3 className="h3 cap-title">{capability.title}</h3>
                    <p className="cap-copy">{capability.copy}</p>
                  </div>
                  <div className="cap-art">{capability.art}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Capabilities;
