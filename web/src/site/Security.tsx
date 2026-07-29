import type { ReactNode } from "react";

import { reveal, useReveal } from "./useReveal";

const PILLS = [
  "Nothing pledged",
  "Small first limits",
  "Reputation at stake",
  "Live throttling",
  "Income you can audit",
];

const ANSWERS: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: (
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
        className="w-5 h-5"
      >
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      </svg>
    ),
    title: "The first loan is tiny",
    body: "A new agent can borrow about half of what it has already earned, and no more. Walking away with the first advance costs more than it pays, because the line that grows behind it is worth more than the cash in hand.",
  },
  {
    icon: (
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
        className="w-5 h-5"
      >
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Reputation is the collateral",
    body: "A score is attached to the agent's identity, not to a wallet it can throw away. Rebuilding one takes the same months of real income that built the first, and lenders can read the whole history before they price it.",
  },
  {
    icon: (
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
        className="w-5 h-5"
      >
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    title: "Income is watched, not assumed",
    body: "The underwriter compares what an agent claims to earn against what actually arrives. When money slows down or stops arriving where it should, the limit drops to zero in the same minute.",
  },
  {
    icon: (
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
        className="w-5 h-5"
      >
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    ),
    title: "This is how credit already works",
    body: "Nobody repossesses a card holder's salary. Unsecured lending works because the borrower's income is visible and the relationship is worth more than one theft. Here the income is visible to everyone.",
  },
];

export function Security() {
  const left = useReveal<HTMLDivElement>();
  const right = useReveal<HTMLDivElement>(0.1);

  return (
    <section
      id="security"
      className="relative py-24 lg:py-32 bg-foreground/[0.02] overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          <div
            ref={left.ref}
            className={`transition-all duration-700 ${reveal(left.shown, 8)}`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              The honest part
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-8">
              Nothing is pledged.
              <br />
              So we price the risk.
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed mb-12">
              A borrower could point its income somewhere else after taking the money. We
              do not pretend otherwise. We make that move cost more than it pays, and we
              watch for it while it happens.
            </p>
            <div className="flex flex-wrap gap-3">
              {PILLS.map((pill, i) => (
                <span
                  key={pill}
                  className={`px-4 py-2 border border-foreground/10 text-sm font-mono transition-all duration-500 ${reveal(left.shown)}`}
                  style={{ transitionDelay: `${200 + i * 50}ms` }}
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div ref={right.ref} className="grid gap-6">
            {ANSWERS.map((answer, i) => (
              <div
                key={answer.title}
                className={`p-6 border border-foreground/10 hover:border-foreground/20 transition-all duration-500 group ${
                  right.shown ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 flex items-center justify-center border border-foreground/10 group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                    {answer.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1 group-hover:translate-x-1 transition-transform duration-300">
                      {answer.title}
                    </h3>
                    <p className="text-muted-foreground">{answer.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
