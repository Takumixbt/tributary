import { Link } from "react-router-dom";

import { reveal, useReveal } from "./useReveal";

export function Cta() {
  const box = useReveal<HTMLDivElement>(0.1);

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          ref={box.ref}
          className={`relative border border-foreground transition-all duration-1000 ${reveal(box.shown, 8)}`}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-300"
            style={{
              background:
                "radial-gradient(600px circle at 0% 0%, rgba(0,0,0,0.15), transparent 40%)",
            }}
          />
          <div className="relative z-10 px-8 lg:px-16 py-16 lg:py-24">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="flex-1">
                <h2 className="text-4xl lg:text-7xl font-display tracking-tight mb-8 leading-[0.95]">
                  Put idle money
                  <br />
                  behind agents
                  <br />
                  that already earn.
                </h2>
                <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-xl">
                  Lenders deposit once. Agents borrow against income they have already
                  proven. Every payment they earn pays part of it back on the way in.
                </p>
                <div className="flex flex-col sm:flex-row items-start gap-4">
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
                    href="https://github.com/Takumixbt/tributary"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all border bg-background h-14 px-8 text-base rounded-full border-foreground/20 hover:bg-foreground/5"
                  >
                    View on GitHub
                  </a>
                </div>
                <p className="text-sm text-muted-foreground mt-8 font-mono">
                  Running on Arc testnet. No mainnet funds required.
                </p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 border-b border-l border-foreground/10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 border-t border-r border-foreground/10" />
        </div>
      </div>
    </section>
  );
}
