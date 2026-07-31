import type { ReactNode } from "react";

import { reveal, useReveal } from "./useReveal";

/**
 * A ledger tape: each payment as a measured bar on a baseline, with the span
 * bracketed the way a drawing dimensions a part.
 */
function IncomeDiagram() {
  // Two identical runs, translated by exactly one run width, so the tape never
  // seams as it scrolls.
  const bars = [14, 22, 9, 27, 18, 31, 12, 24, 20, 35, 16, 28];
  const step = 14;
  const runWidth = bars.length * step;

  const run = (offset: number) =>
    bars.map((h, i) => (
      <line
        key={`${offset}-${i}`}
        x1={offset + i * step}
        y1="112"
        x2={offset + i * step}
        y2={112 - h}
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.7"
      />
    ));

  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <clipPath id="tape-clip">
          <rect x="16" y="20" width="168" height="94" />
        </clipPath>
      </defs>

      <g clipPath="url(#tape-clip)">
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`0 0;-${runWidth} 0`}
            dur="9s"
            repeatCount="indefinite"
          />
          {run(20)}
          {run(20 + runWidth)}
        </g>
      </g>

      <line x1="16" y1="112" x2="184" y2="112" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      {/* the reading head: income is recorded as it arrives */}
      <line x1="150" y1="24" x2="150" y2="112" stroke="currentColor" strokeWidth="1" opacity="0.25">
        <animate attributeName="opacity" values="0.1;0.35;0.1" dur="2.6s" repeatCount="indefinite" />
      </line>
      <path d="M16 124 L16 130 L184 130 L184 124" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <text x="100" y="146" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.55">
        RECORDED INCOME
      </text>
      <text x="16" y="28" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.45">
        USDC
      </text>
    </svg>
  );
}

/**
 * A junction drawn to scale: one line in, two out, and the stroke weight of
 * each branch is its share of the money.
 */
function SplitDiagram() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <line x1="8" y1="80" x2="84" y2="80" stroke="currentColor" strokeWidth="2.4" opacity="0.75" />
      <rect x="84" y="64" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="100" y1="64" x2="100" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      {/* 80 percent carries on, drawn heavy */}
      <path d="M116 74 L192 50" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.75" />
      {/* 20 percent turns down to the lenders, drawn light */}
      <path d="M116 88 L192 118" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.6" />
      {/* A steady stream of payments, each one forking at the junction. Three
          in flight at a time so the line is never empty. */}
      {[0, 1, 2].map((n) => {
        const begin = `${n * 0.8}s`;
        return (
          <g key={n}>
            <circle r="3" fill="currentColor" opacity="0">
              <animateMotion path="M8,80 L84,80" dur="2.4s" begin={begin} repeatCount="indefinite" />
              <animate
                attributeName="opacity"
                values="0;1;1;0;0"
                keyTimes="0;0.06;0.4;0.42;1"
                dur="2.4s"
                begin={begin}
                repeatCount="indefinite"
              />
            </circle>
            <circle r="2.6" fill="currentColor" opacity="0">
              <animateMotion
                path="M116,74 L192,50"
                dur="2.4s"
                begin={begin}
                repeatCount="indefinite"
                keyPoints="0;0;1"
                keyTimes="0;0.42;0.9"
                calcMode="linear"
              />
              <animate
                attributeName="opacity"
                values="0;0;1;1;0"
                keyTimes="0;0.42;0.48;0.84;0.9"
                dur="2.4s"
                begin={begin}
                repeatCount="indefinite"
              />
            </circle>
            <circle r="1.6" fill="currentColor" opacity="0">
              <animateMotion
                path="M116,88 L192,118"
                dur="2.4s"
                begin={begin}
                repeatCount="indefinite"
                keyPoints="0;0;1"
                keyTimes="0;0.42;0.9"
                calcMode="linear"
              />
              <animate
                attributeName="opacity"
                values="0;0;1;1;0"
                keyTimes="0;0.42;0.48;0.84;0.9"
                dur="2.4s"
                begin={begin}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        );
      })}
      {/* the junction registers each arrival */}
      <rect x="84" y="64" width="32" height="32" fill="currentColor" opacity="0">
        <animate
          attributeName="opacity"
          values="0;0.14;0"
          keyTimes="0;0.44;0.6"
          dur="2.4s"
          repeatCount="indefinite"
        />
      </rect>
      <text x="192" y="40" textAnchor="end" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.55">
        AGENT 80
      </text>
      <text x="192" y="132" textAnchor="end" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.55">
        LENDERS 20
      </text>
      <text x="8" y="66" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.45">
        PAYMENT
      </text>
    </svg>
  );
}

/**
 * The underwriter's read: observations plotted against time, the fitted line
 * drawing itself through them, and the limit that follows from it.
 */
function ScoreDiagram() {
  const points = [
    [24, 106],
    [40, 100],
    [56, 103],
    [72, 92],
    [88, 86],
    [104, 88],
    [120, 74],
    [136, 66],
    [152, 62],
    [168, 52],
  ];
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      {/* axes */}
      <line x1="16" y1="120" x2="184" y2="120" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="16" y1="24" x2="16" y2="120" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      {/* the limit the score earns */}
      <line
        x1="16"
        y1="44"
        x2="184"
        y2="44"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.35"
      />
      {/* The read sweeps the history on a loop: the fit is drawn as it passes,
          and each observation lights up when the sweep reaches it. */}
      <path
        d="M24 108 L168 54"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="160"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="160;0;0;160"
          keyTimes="0;0.55;0.9;1"
          dur="6s"
          repeatCount="indefinite"
        />
      </path>
      {points.map(([x, y], i) => {
        const at = 0.06 + (i / (points.length - 1)) * 0.49;
        return (
          <circle key={i} cx={x} cy={y} r="2" fill="currentColor" opacity="0">
            <animate
              attributeName="opacity"
              values="0;0;0.85;0.85;0"
              keyTimes={`0;${at.toFixed(3)};${(at + 0.02).toFixed(3)};0.92;1`}
              dur="6s"
              repeatCount="indefinite"
            />
          </circle>
        );
      })}
      <line x1="24" y1="24" x2="24" y2="120" stroke="currentColor" strokeWidth="1" opacity="0.3">
        <animate attributeName="x1" values="24;168;168;24" keyTimes="0;0.55;0.9;1" dur="6s" repeatCount="indefinite" />
        <animate attributeName="x2" values="24;168;168;24" keyTimes="0;0.55;0.9;1" dur="6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.3;0;0" keyTimes="0;0.55;0.7;1" dur="6s" repeatCount="indefinite" />
      </line>
      <text x="184" y="38" textAnchor="end" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.5">
        LIMIT
      </text>
      <text x="100" y="146" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.55">
        SCORE OVER TIME
      </text>
    </svg>
  );
}

/**
 * What a lender holds: a share price that only steps up, each step the interest
 * from one repayment landing.
 */
function VaultDiagram() {
  const steps = "M16 116 L44 116 L44 106 L72 106 L72 98 L100 98 L100 84 L128 84 L128 72 L156 72 L156 58 L184 58";
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <line x1="16" y1="124" x2="184" y2="124" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="16" y1="24" x2="16" y2="124" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      {/* par, so the rise above it is legible */}
      <line
        x1="16"
        y1="116"
        x2="184"
        y2="116"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.3"
      />
      {/* The line redraws on a loop, with a head marking the newest repayment. */}
      <path id="share-steps" d={steps} fill="none" stroke="currentColor" strokeWidth="1.75" strokeDasharray="320">
        <animate
          attributeName="stroke-dashoffset"
          values="320;0;0;320"
          keyTimes="0;0.6;0.92;1"
          dur="6.5s"
          repeatCount="indefinite"
        />
      </path>
      <circle r="2.6" fill="currentColor" opacity="0">
        <animateMotion dur="6.5s" repeatCount="indefinite" keyPoints="0;1;1;0" keyTimes="0;0.6;0.92;1">
          <mpath href="#share-steps" />
        </animateMotion>
        <animate
          attributeName="opacity"
          values="0;0.9;0.9;0;0"
          keyTimes="0;0.05;0.6;0.94;1"
          dur="6.5s"
          repeatCount="indefinite"
        />
      </circle>
      <text x="16" y="36" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.45">
        SHARE PRICE
      </text>
      <text x="184" y="140" textAnchor="end" fontSize="8" fontFamily="monospace" fill="currentColor" opacity="0.55">
        INTEREST PAID
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
