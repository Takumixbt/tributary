import type { ReactNode } from "react";

import { reveal, useReveal } from "./useReveal";

/** Income arriving as a stream of small marks, gathering into one ledger line. */
function IncomeDiagram() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <line x1="20" y1="130" x2="180" y2="130" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <circle key={i} cx={28 + i * 24} cy="130" r="3" fill="currentColor">
          <animate
            attributeName="cy"
            values="40;130"
            dur="2.4s"
            begin={`${i * 0.3}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0.2"
            dur="2.4s"
            begin={`${i * 0.3}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
      <rect x="20" y="136" width="160" height="14" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <text x="100" y="146" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.6">
        INCOME HISTORY
      </text>
      <text x="100" y="26" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.5">
        PAYMENTS
      </text>
    </svg>
  );
}

/** One payment arriving and splitting into two, the smaller share turning back. */
function SplitDiagram() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <line x1="10" y1="80" x2="95" y2="80" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <line x1="105" y1="80" x2="190" y2="42" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <line x1="105" y1="80" x2="190" y2="118" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <rect x="88" y="66" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle r="4" fill="currentColor">
        <animateMotion path="M10,80 L88,80" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle r="3.6" fill="currentColor">
        <animateMotion path="M116,76 L190,42" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
      </circle>
      <circle r="2" fill="currentColor">
        <animateMotion path="M116,84 L190,118" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
      </circle>
      <text x="196" y="38" textAnchor="end" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.6">
        AGENT 80%
      </text>
      <text x="196" y="132" textAnchor="end" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.6">
        LENDERS 20%
      </text>
    </svg>
  );
}

/** A score arc filling, with a limit stepping up behind it. */
function ScoreDiagram() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <path
        d="M40 120 A 60 60 0 0 1 160 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.25"
      />
      <path
        d="M40 120 A 60 60 0 0 1 160 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="188"
        strokeDashoffset="188"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="188;138;188"
          dur="6s"
          repeatCount="indefinite"
        />
      </path>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={52 + i * 26}
          y={132}
          width="18"
          height="8"
          fill="currentColor"
          opacity="0.15"
        >
          <animate
            attributeName="opacity"
            values="0.15;0.7;0.15"
            dur="6s"
            begin={`${i * 0.5}s`}
            repeatCount="indefinite"
          />
        </rect>
      ))}
      <text x="100" y="108" textAnchor="middle" fontSize="14" fontFamily="monospace" fill="currentColor">
        268
      </text>
      <text x="100" y="154" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.6">
        SCORE AND LIMIT
      </text>
    </svg>
  );
}

/** Deposits stacking, a thin line of interest lifting the top edge. */
function VaultDiagram() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <rect x="46" y="46" width="108" height="86" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x="46"
          y={112 - i * 22}
          width="108"
          height="20"
          fill="currentColor"
          opacity="0.12"
        >
          <animate
            attributeName="opacity"
            values="0.05;0.2;0.05"
            dur="4s"
            begin={`${i * 0.8}s`}
            repeatCount="indefinite"
          />
        </rect>
      ))}
      <line x1="46" y1="46" x2="154" y2="46" stroke="currentColor" strokeWidth="2">
        <animate attributeName="y1" values="52;44;52" dur="4s" repeatCount="indefinite" />
        <animate attributeName="y2" values="52;44;52" dur="4s" repeatCount="indefinite" />
      </line>
      <text x="100" y="152" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.6">
        SHARE PRICE
      </text>
    </svg>
  );
}

const FEATURES: Array<{ index: string; title: string; body: string; art: ReactNode }> = [
  {
    index: "01",
    title: "Income is the application",
    body: "An agent's customers pay it through a contract, so every payment it has ever received is on the record. There is no form to fill in and no revenue to take on faith. The earnings history is the credit file, and anyone can check it.",
    art: <IncomeDiagram />,
  },
  {
    index: "02",
    title: "Repayment happens at the door",
    body: "Money the agent earns arrives at a contract it does not control. A fifth of each payment goes to the lenders and the rest carries on to the agent. That continues until the loan is clear, and then everything passes straight through.",
    art: <SplitDiagram />,
  },
  {
    index: "03",
    title: "An underwriter that never sleeps",
    body: "A program reads each agent's income, gives it a score out of a thousand, and writes the reasoning on chain next to it. Good history raises the limit and cuts the rate. Income that stalls closes the line the same minute.",
    art: <ScoreDiagram />,
  },
  {
    index: "04",
    title: "Lenders are paid by borrowers",
    body: "Deposit once and the money is lent to agents that already earn. Returns come from interest those agents pay, not from a token printed to make the number look good. Withdraw whatever is not currently on loan.",
    art: <VaultDiagram />,
  },
];

function FeatureRow({ feature, delay }: { feature: (typeof FEATURES)[number]; delay: number }) {
  const row = useReveal<HTMLDivElement>(0.1);

  return (
    <div
      ref={row.ref}
      className={`group relative transition-all duration-700 ${reveal(row.shown, 12)}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 py-12 lg:py-20 border-b border-foreground/10">
        <div className="shrink-0">
          <span className="font-mono text-sm text-muted-foreground">{feature.index}</span>
        </div>
        <div className="flex-1 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-3xl lg:text-4xl font-display mb-4 group-hover:translate-x-2 transition-transform duration-500">
              {feature.title}
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">{feature.body}</p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="w-48 h-40 text-foreground">{feature.art}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Features() {
  const head = useReveal<HTMLHeadingElement>();

  return (
    <section id="features" className="relative py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-16 lg:mb-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            How the credit works
          </span>
          <h2
            ref={head.ref}
            className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${reveal(head.shown)}`}
          >
            Income decides who borrows.
            <br />
            <span className="text-muted-foreground">The contract decides who gets repaid.</span>
          </h2>
        </div>
        <div>
          {FEATURES.map((feature, i) => (
            <FeatureRow key={feature.index} feature={feature} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
