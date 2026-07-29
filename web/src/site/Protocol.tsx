import { useState } from "react";

import { reveal, useReveal } from "./useReveal";

const EXPLORER = "https://testnet.arcscan.app/address";

const CONTRACTS = [
  {
    name: "TributaryVault",
    address: "0xe13572efdfea23fe04f7cc81f98c083254a44ba8",
    role: "Holds lender deposits, opens credit lines, accrues interest by the second.",
  },
  {
    name: "AgentRegistry",
    address: "0x897e3607b3dc5229ed4052ed09af7f6a70ec6c22",
    role: "Registers an agent, deploys its router, records its score and the reasoning.",
  },
  {
    name: "RevenueRouter",
    address: "0xF81EEE56be9Fd9d487A847f35CF4dfe563Eb778d",
    role: "Receives the agent's income and splits it before the agent can touch it.",
  },
];

const NOTES = [
  { title: "Deployed and verifiable", body: "Three contracts on Arc testnet. Open any of them in the explorer." },
  { title: "Sixteen tests", body: "The credit loop is covered end to end, including a seven day repayment run." },
  { title: "No admin over money", body: "Repayment is a contract rule. Nobody can call it off for a favoured borrower." },
  { title: "Read the source", body: "Contracts, agents and this interface are all in one public repository." },
];

const CYCLE = [
  { step: "Income", detail: "30 payments settled", note: "0.02 USDC each" },
  { step: "Score", detail: "139 out of 1000", note: "first pass" },
  { step: "Line", detail: "0.1965 USDC at 22.22%", note: "opened by the underwriter" },
  { step: "Draw", detail: "0.15 USDC", note: "working capital taken" },
  { step: "Repay", detail: "0.0393 USDC", note: "taken from the next flush" },
  { step: "Rescore", detail: "268 at 19.64%", note: "limit up, rate down" },
];

export function Protocol() {
  const left = useReveal<HTMLDivElement>();
  const right = useReveal<HTMLDivElement>(0.1);
  const [tab, setTab] = useState(0);

  return (
    <section id="protocol" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          <div
            ref={left.ref}
            className={`transition-all duration-700 ${reveal(left.shown, 8)}`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              For developers
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-8">
              Live on Arc.
              <br />
              <span className="text-muted-foreground">Open to read.</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
              Everything on this page happened on a public network and can be checked
              transaction by transaction. The addresses below are the ones running right
              now.
            </p>
            <div className="grid grid-cols-2 gap-6">
              {NOTES.map((note, i) => (
                <div
                  key={note.title}
                  className={`transition-all duration-500 ${reveal(left.shown)}`}
                  style={{ transitionDelay: `${200 + i * 50}ms` }}
                >
                  <h3 className="font-medium mb-1">{note.title}</h3>
                  <p className="text-sm text-muted-foreground">{note.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            ref={right.ref}
            className={`lg:sticky lg:top-32 transition-all duration-700 delay-200 ${
              right.shown ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="border border-foreground/10">
              <div className="flex items-center border-b border-foreground/10">
                {["Contracts", "The cycle"].map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setTab(i)}
                    className={`px-6 py-4 text-sm font-mono transition-colors relative ${
                      tab === i ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                    {tab === i && (
                      <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />
                    )}
                  </button>
                ))}
                <div className="flex-1" />
                <span className="px-4 py-4 text-xs font-mono text-muted-foreground">
                  Arc testnet
                </span>
              </div>

              {tab === 0 ? (
                <div className="divide-y divide-foreground/10">
                  {CONTRACTS.map((contract) => (
                    <a
                      key={contract.name}
                      href={`${EXPLORER}/${contract.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block px-6 py-6 hover:bg-foreground/[0.02] transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <span className="font-medium group-hover:translate-x-1 transition-transform">
                          {contract.name}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <path d="M7 7h10v10" />
                          <path d="M7 17 17 7" />
                        </svg>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground break-all mb-2">
                        {contract.address}
                      </div>
                      <p className="text-sm text-muted-foreground">{contract.role}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-foreground/10">
                  {CYCLE.map((row) => (
                    <div
                      key={row.step}
                      className="px-6 py-5 flex items-baseline justify-between gap-6"
                    >
                      <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                        {row.step}
                      </span>
                      <span className="flex-1 font-medium">{row.detail}</span>
                      <span className="text-sm text-muted-foreground text-right">
                        {row.note}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-6 py-4 border-t border-foreground/10 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                <span className="text-xs font-mono text-muted-foreground">
                  Every figure above is on chain
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
