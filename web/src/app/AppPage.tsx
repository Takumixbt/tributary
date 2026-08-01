/*
 * The app.
 *
 * Written for someone who has never heard of any of this. The page answers
 * three questions in order: what is this, what happens to my money, and what
 * do I press. Anything that only a developer would want (addresses, share
 * price, basis points, event logs) is either translated into a sentence or
 * moved to the very bottom.
 */

import { useAgents, useEventStream, useEvents, useVaultState } from "../data";
import { BorrowerCard } from "./BorrowerCard";
import { DepositCard } from "./DepositCard";
import { usd } from "./Money";

const EXPLORER = "https://testnet.arcscan.app/address";

const CONTRACTS = [
  { name: "The pool", address: "0xe13572efdfea23fe04f7cc81f98c083254a44ba8" },
  { name: "Agent register", address: "0x897e3607b3dc5229ed4052ed09af7f6a70ec6c22" },
  { name: "Payment splitter", address: "0xF81EEE56be9Fd9d487A847f35CF4dfe563Eb778d" },
];

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl lg:text-5xl font-display tracking-tight">{value}</div>
      <div className="mt-2 text-muted-foreground">{label}</div>
    </div>
  );
}

/** Events, rewritten as sentences a person can read at a glance. */
function activityLine(kind: string, amount: bigint, who: string): string | null {
  switch (kind) {
    case "split":
      return `${who} got paid, and part of it went to the pool`;
    case "repay":
      return `${who} paid back ${usd(amount)} USDC`;
    case "draw":
      return `${who} borrowed ${usd(amount)} USDC`;
    case "deposit":
      return `Someone added ${usd(amount)} USDC to the pool`;
    case "score":
      return `${who} was re-scored`;
    case "register":
      return `${who} joined`;
    default:
      return null;
  }
}

export function AppPage() {
  const vault = useVaultState();
  const agents = useAgents();
  const events = useEvents(undefined, 6);
  const simulated = useEventStream().mode === "demo";

  const lentOut = vault.totalPrincipal;
  const free = vault.availableLiquidity;

  return (
    <main className="relative">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-36 lg:pt-44 pb-24 lg:pb-32">
        <div className="mb-16 lg:mb-24 max-w-3xl">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            {simulated ? "Practice mode" : "Live on Arc testnet"}
          </span>
          <h1 className="text-4xl lg:text-6xl font-display tracking-tight leading-[0.95] mb-6">
            Put money behind agents
            <br />
            that already get paid.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Your money is lent to software that earns a living doing small jobs. Every time
            one of them gets paid, a fixed slice comes back here before the agent sees the
            rest. That is how you get repaid, and it happens without anyone being trusted.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-12 lg:gap-16 items-start">
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pb-12 border-b border-foreground/10">
              <Figure value={usd(vault.totalAssets)} label="In the pool" />
              <Figure value={usd(lentOut)} label="Lent to agents" />
              <Figure value={usd(free)} label="Free to take out" />
            </div>

            <div className="pt-12">
              <h2 className="text-2xl lg:text-3xl font-display mb-2">Who is borrowing</h2>
              <p className="text-muted-foreground mb-8">
                {agents.length === 0
                  ? "No agents have borrowed yet."
                  : "Each one earns money on its own and repays out of that income."}
              </p>
              <div className="grid gap-4">
                {agents.map((agent) => (
                  <BorrowerCard key={agent.address} agent={agent} />
                ))}
              </div>
            </div>

            {events.length > 0 ? (
              <div className="pt-12">
                <h2 className="text-2xl lg:text-3xl font-display mb-8">Lately</h2>
                <ul className="space-y-3">
                  {events.map((event) => {
                    const amount =
                      "amount" in event && typeof event.amount === "bigint" ? event.amount : 0n;
                    const who =
                      "agentLabel" in event && typeof event.agentLabel === "string"
                        ? event.agentLabel
                        : "An agent";
                    const line = activityLine(event.kind, amount, who);
                    if (!line) return null;
                    return (
                      <li
                        key={event.id}
                        className="flex items-baseline justify-between gap-6 py-3 border-b border-foreground/10 last:border-0"
                      >
                        <span>{line}</span>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(event.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="lg:sticky lg:top-28">
            <DepositCard />
            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
              This is a testnet. The money is not real, and fees here are paid in USDC
              rather than any other token.
            </p>
          </div>
        </div>

        <div className="mt-24 pt-8 border-t border-foreground/10">
          <p className="text-sm text-muted-foreground mb-4">
            Everything above runs on three open contracts. Anyone can read them.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {CONTRACTS.map((contract) => (
              <a
                key={contract.address}
                href={`${EXPLORER}/${contract.address}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                {contract.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default AppPage;
