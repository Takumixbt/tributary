import type { AgentState } from "../lib/types";
import { share, usd, yearlyRate } from "./Money";

/**
 * Agents describe themselves on chain in developer shorthand ("x402 service").
 * Nobody reading this page needs the name of a payment standard, so protocol
 * words are stripped and anything left unreadable falls back to plain English.
 */
function describe(service: string): string {
  const cleaned = service
    .replace(/\bx402\b/gi, "")
    .replace(/\bnanopayments?\b/gi, "")
    .replace(/\berc-?8004\b/gi, "")
    .replace(/\bapi\b/gi, "")
    .replace(/\bservice\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[,.;:-]+|[,.;:-]+$/g, "")
    .trim();

  return cleaned.length > 2 ? cleaned : "small jobs for other software";
}

/**
 * One borrower, described the way you would describe a person: what it does
 * for money, how much it owes, and how it is paying that back. The address,
 * the score internals and the basis points stay out of it.
 */
export function BorrowerCard({ agent }: { agent: AgentState }) {
  const used = agent.limit > 0n ? Number((agent.debt * 100n) / agent.limit) : 0;
  const owes = agent.debt > 0n;

  return (
    <div className="border border-foreground/10 p-6 lg:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-6">
        <div>
          <h3 className="text-xl font-display">{agent.label}</h3>
          <p className="text-muted-foreground">Gets paid for {describe(agent.service)}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {agent.score > 0 ? `Trusted ${agent.score} out of 1000` : "Not scored yet"}
        </p>
      </div>

      {owes ? (
        <>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Owes {usd(agent.debt)} of {usd(agent.limit)} USDC
            </span>
            <span className="text-sm text-muted-foreground">{100 - used}% still available</span>
          </div>
          <div className="h-1.5 bg-foreground/10">
            <div
              className="h-full bg-foreground transition-[width] duration-700"
              style={{ width: `${Math.min(100, used)}%` }}
            />
          </div>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            Every time it gets paid, {share(agent.repaymentBps)} of that payment goes
            straight to the pool before it reaches the agent. It is being charged{" "}
            {yearlyRate(agent.aprBps)} on what is still owed.
          </p>
        </>
      ) : (
        <p className="text-muted-foreground leading-relaxed">
          Nothing owed right now. It can borrow up to {usd(agent.limit)} USDC against what
          it earns, and repayments would come out of its income automatically.
        </p>
      )}

      {agent.repaidTotal > 0n ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Paid back {usd(agent.repaidTotal)} USDC so far.
        </p>
      ) : null}
    </div>
  );
}
