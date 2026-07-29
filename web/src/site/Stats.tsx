import { useEffect, useRef, useState } from "react";

import { reveal, useReveal } from "./useReveal";

/**
 * The proven cycle, in four figures. Every one of these came off Arc testnet
 * and can be opened in the explorer. Nothing here reads the simulator.
 */
const FIGURES = [
  { value: 30, suffix: "", decimals: 0, label: "Payments settled through the agent's router" },
  { value: 0.15, suffix: "", decimals: 4, label: "USDC drawn against the agent's income" },
  { value: 0.0393, suffix: "", decimals: 4, label: "USDC repaid automatically on the next flush" },
  { value: 268, suffix: "", decimals: 0, label: "Credit score after the cycle, up from 139" },
];

function CountUp({
  value,
  decimals,
  suffix,
  run,
}: {
  value: number;
  decimals: number;
  suffix: string;
  run: boolean;
}) {
  const [shown, setShown] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (!run) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }

    const start = performance.now();
    const duration = 1400;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease out cubic: fast to start, settles on the real number.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(value * eased);
      if (t < 1) frame.current = window.requestAnimationFrame(step);
    };

    frame.current = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame.current);
  }, [run, value]);

  return (
    <>
      {shown.toFixed(decimals)}
      {suffix}
    </>
  );
}

export function Stats() {
  const head = useReveal<HTMLHeadingElement>();
  const grid = useReveal<HTMLDivElement>(0.2);

  return (
    <section className="relative py-24 lg:py-32 border-y border-foreground/10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16 lg:mb-24">
          <div>
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              One proven cycle
            </span>
            <h2
              ref={head.ref}
              className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${reveal(head.shown)}`}
            >
              The numbers
              <br />
              that matter.
            </h2>
          </div>
          <div className="flex items-center gap-4 font-mono text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
              Live
            </span>
            <span className="text-foreground/30">|</span>
            <span>Arc testnet</span>
          </div>
        </div>

        <div
          ref={grid.ref}
          className="grid grid-cols-1 md:grid-cols-2 gap-px bg-foreground/10"
        >
          {FIGURES.map((figure, i) => (
            <div
              key={figure.label}
              className={`bg-background p-8 lg:p-12 transition-all duration-700 ${reveal(grid.shown, 8)}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="text-6xl lg:text-8xl font-display tracking-tight">
                <CountUp
                  value={figure.value}
                  decimals={figure.decimals}
                  suffix={figure.suffix}
                  run={grid.shown}
                />
              </div>
              <div className="mt-4 text-lg text-muted-foreground">{figure.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
