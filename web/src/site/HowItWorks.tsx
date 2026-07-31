import { useEffect, useState } from "react";

import { reveal, useReveal } from "./useReveal";

const STEPS = [
  {
    numeral: "I",
    title: "The agent gets paid",
    body: "It sells whatever it is good at, one small job at a time, and the money lands at a contract of its own. Every payment is recorded there, so its income is a matter of record rather than a claim.",
  },
  {
    numeral: "II",
    title: "The line opens",
    body: "The underwriter reads that record, scores it, and offers a limit priced on what the agent actually earns. When the agent needs money up front for a job, it draws against the line and starts paying interest by the second.",
  },
  {
    numeral: "III",
    title: "The debt pays itself down",
    body: "From then on, a fifth of every payment it earns stops at the contract and clears part of the loan before the rest carries on. Nobody sends an invoice and nobody has to be trusted. When the debt is gone the split stops.",
  },
];

const CODE_LINES = [
  "// the agent's income arrives at its own contract",
  "router.flush()",
  "  -> vault.repay(agent, share)",
  "  -> agent.receive(remainder)",
  "",
  "// the underwriter reads the record and prices it",
  "score  = underwrite(revenueHistory)   // 268 / 1000",
  "limit  = 0.294750 USDC",
  "apr    = 19.64%",
  "",
  "// nothing above needs anyone's permission",
];

function CodePanel({ run }: { run: boolean }) {
  let charIndex = 0;

  return (
    <div className="border border-foreground/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-foreground/20" />
          <div className="w-3 h-3 rounded-full bg-foreground/20" />
          <div className="w-3 h-3 rounded-full bg-foreground/20" />
        </div>
        <span className="text-xs font-mono text-muted-foreground">tributary-credit-loop.ts</span>
      </div>
      <div className="p-8 font-mono text-sm min-h-[280px]">
        <pre className="text-muted-foreground">
          {CODE_LINES.map((line, lineNumber) => (
            <div key={lineNumber} className="leading-loose">
              <span className="text-foreground/25 select-none w-8 inline-block">
                {lineNumber + 1}
              </span>
              <span className="inline-flex">
                {line.split("").map((char, i) => {
                  const delay = run ? charIndex * 12 : 0;
                  charIndex += 1;
                  return (
                    <span
                      key={i}
                      style={{
                        animationDelay: `${delay}ms`,
                        opacity: run ? 0 : 1,
                        animationName: run ? "fade-in" : undefined,
                        animationDuration: "220ms",
                        animationFillMode: "forwards",
                      }}
                    >
                      {char === " " ? " " : char}
                    </span>
                  );
                })}
              </span>
            </div>
          ))}
        </pre>
      </div>
      <div className="px-6 py-4 border-t border-foreground/10 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
        <span className="text-xs font-mono text-muted-foreground">Arc testnet</span>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const head = useReveal<HTMLHeadingElement>();
  const panel = useReveal<HTMLDivElement>(0.2);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!panel.shown) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % STEPS.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [panel.shown]);

  return (
    <section
      id="how-it-works"
      className="relative py-24 lg:py-32 border-y border-foreground/10 overflow-hidden"
    >
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-16 lg:mb-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            The loop
          </span>
          <h2
            ref={head.ref}
            className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${reveal(head.shown)}`}
          >
            Three steps.
            <br />
            <span className="text-muted-foreground">Nobody has to be trusted.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          <div className="space-y-0">
            {STEPS.map((step, i) => (
              <button
                key={step.numeral}
                type="button"
                onClick={() => setActive(i)}
                className={`w-full text-left py-8 border-b border-foreground/10 transition-all duration-500 group ${
                  active === i ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <div className="flex items-start gap-6">
                  <span className="font-display text-3xl text-foreground/30">{step.numeral}</span>
                  <div className="flex-1">
                    <h3 className="text-2xl lg:text-3xl font-display mb-3 group-hover:translate-x-2 transition-transform duration-300">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{step.body}</p>
                    {active === i && (
                      <div className="mt-4 h-px bg-foreground/20 overflow-hidden">
                        <div
                          key={`bar-${active}`}
                          className="h-full bg-foreground w-0"
                          style={{ animation: "step-progress 5s linear forwards" }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div ref={panel.ref} className="lg:sticky lg:top-32 self-start">
            <CodePanel run={panel.shown} />
          </div>
        </div>
      </div>
    </section>
  );
}
