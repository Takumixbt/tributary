import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { GlyphGlobe } from "./GlyphGlobe";

const ANIMATED_WORD = "earn";

const MARQUEE_STATS = [
  { figure: "$0.000001", note: "Smallest payment settled", tag: "PAYMENTS" },
  { figure: "20%", note: "Of each payment clears the loan", tag: "REPAYMENT" },
  { figure: "268", note: "Credit score, up from 139", tag: "UNDERWRITING" },
  { figure: "Sub-second", note: "Settlement on Arc", tag: "SPEED" },
  { figure: "Live", note: "Deployed on testnet", tag: "STATUS" },
];

function GridField() {
  const rows = [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const cols = Array.from({ length: 11 }, (_, i) => (i + 1) * 8.33);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {rows.map((top) => (
        <div
          key={`r${top}`}
          className="absolute h-px bg-foreground/10"
          style={{ top: `${top}%`, left: 0, right: 0 }}
        />
      ))}
      {cols.map((left) => (
        <div
          key={`c${left}`}
          className="absolute w-px bg-foreground/10"
          style={{ left: `${left}%`, top: 0, bottom: 0 }}
        />
      ))}
    </div>
  );
}

function StatRun() {
  return (
    <div className="flex gap-16 shrink-0">
      {MARQUEE_STATS.map((stat) => (
        <div key={stat.tag} className="flex items-baseline gap-4">
          <span className="text-4xl lg:text-5xl font-display">{stat.figure}</span>
          <span className="text-sm text-muted-foreground">
            {stat.note}
            <span className="block font-mono text-xs mt-1">{stat.tag}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const settle = mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4";

  return (
    <section className="relative min-h-[145vh] flex flex-col overflow-hidden">
      <div className="absolute right-0 top-1/3 -translate-y-1/2 w-[600px] h-[600px] lg:w-[800px] lg:h-[800px] pointer-events-none">
        <GlyphGlobe />
      </div>

      <GridField />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 pt-36 lg:pt-44 w-full">
        <div className={`mb-8 transition-all duration-700 ${settle}`}>
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
            <span className="w-8 h-px bg-foreground/30" />
            Credit infrastructure for autonomous agents on Arc
          </span>
        </div>

        <div className="mb-14">
          <h1
            className={`text-[clamp(2.5rem,7vw,7rem)] font-display leading-[0.9] tracking-tight transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="block">Working capital for</span>
            <span className="block">
              agents that{" "}
              <span className="relative inline-block">
                <span className="inline-flex whitespace-nowrap">
                  {ANIMATED_WORD.split("").map((char, i) => (
                    <span
                      key={`${char}-${i}`}
                      className="inline-block animate-char-in"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </span>
            </span>
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24">
          <p
            className={`text-xl lg:text-2xl text-muted-foreground leading-relaxed transition-all duration-700 delay-200 ${settle}`}
          >
            Tributary lends against income an agent has already collected. A fixed share of
            every payment it receives clears the debt before the rest arrives.
          </p>
        </div>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 mt-28 lg:mt-36 w-full">
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${settle}`}
        >
          <Link
            to="/app"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all bg-foreground hover:bg-foreground/90 text-background px-8 h-14 text-base rounded-full group"
          >
            Launch App
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
              className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <a
            href="#protocol"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all border bg-background h-14 px-8 text-base rounded-full border-foreground/20 hover:bg-foreground/5"
          >
            View contracts
          </a>
        </div>
      </div>

      {/* In flow and pushed to the bottom, so a short window can never let it
          collide with the buttons above it. */}
      <div
        className={`relative z-10 mt-auto pt-24 pb-10 transition-all duration-700 delay-500 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex gap-16 marquee whitespace-nowrap">
          <StatRun />
          <StatRun />
        </div>
      </div>
    </section>
  );
}
