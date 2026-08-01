/*
 * The terminal.
 *
 * Live protocol state, in the terms the contracts are written in. No
 * explanation of what a loan is: the audience for this page can read a credit
 * line. Every figure here is a chain read, refreshed on the stream cadence.
 */

import { useAgents, useEventStream, useEvents, useVaultState } from "../data";
import { BorrowerCard } from "./BorrowerCard";
import { DepositCard } from "./DepositCard";
import { pct, sharePrice, usdc } from "./Money";

const EXPLORER_TX = "https://testnet.arcscan.app/tx";

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="px-6 py-5">
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-2xl lg:text-3xl mt-2 tabular-nums">{value}</div>
      {note ? <div className="text-xs text-muted-foreground mt-1">{note}</div> : null}
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  split: "RevenueSplit",
  repay: "Repaid",
  draw: "Drawn",
  deposit: "Deposited",
  withdraw: "Withdrawn",
  score: "ScoreUpdated",
  register: "AgentRegistered",
  line: "LineUpdated",
  payment: "Payment",
  clearance: "DebtCleared",
};

export function AppPage() {
  const vault = useVaultState();
  const agents = useAgents();
  const events = useEvents(undefined, 12);
  const simulated = useEventStream().mode === "demo";

  const utilization =
    vault.totalAssets > 0n ? Number((vault.totalPrincipal * 10_000n) / vault.totalAssets) : 0;

  return (
    <main className="relative">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-36 lg:pt-40 pb-24 lg:pb-32">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div>
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-5">
              <span className="w-8 h-px bg-foreground/30" />
              {simulated ? "Simulation" : "Arc testnet · chain 5042002"}
            </span>
            <h1 className="text-4xl lg:text-5xl font-display tracking-tight">Loan book</h1>
          </div>
          <p className="font-mono text-xs text-muted-foreground max-w-sm leading-relaxed">
            Interest accrues per second on outstanding principal. Repayment is withheld at
            the router before revenue reaches the borrower.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-px bg-foreground/10 border border-foreground/10 mb-12">
          <div className="bg-background">
            <Metric label="Total assets" value={usdc(vault.totalAssets, 4)} note="USDC" />
          </div>
          <div className="bg-background">
            <Metric label="Principal" value={usdc(vault.totalPrincipal, 4)} note="outstanding" />
          </div>
          <div className="bg-background">
            <Metric label="Liquidity" value={usdc(vault.availableLiquidity, 4)} note="withdrawable" />
          </div>
          <div className="bg-background">
            <Metric label="Utilization" value={pct(utilization)} note="principal / assets" />
          </div>
          <div className="bg-background">
            <Metric label="Share price" value={sharePrice(vault.sharePrice)} note="assets / shares" />
          </div>
          <div className="bg-background">
            <Metric label="Book APR" value={pct(vault.apyBps)} note="principal weighted" />
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-14 items-start">
          <div>
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-2xl font-display">Credit lines</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {agents.length} borrower{agents.length === 1 ? "" : "s"}
              </span>
            </div>

            {agents.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground border border-foreground/10 px-6 py-8">
                No agents registered on this deployment yet.
              </p>
            ) : (
              <div className="grid gap-4">
                {agents.map((agent) => (
                  <BorrowerCard key={agent.address} agent={agent} />
                ))}
              </div>
            )}

            {events.length > 0 ? (
              <div className="mt-14">
                <h2 className="text-2xl font-display mb-6">Events</h2>
                <div className="border border-foreground/10 divide-y divide-foreground/10">
                  {events.map((event) => {
                    const amount =
                      "amount" in event && typeof event.amount === "bigint" ? event.amount : null;
                    const who =
                      "agentLabel" in event && typeof event.agentLabel === "string"
                        ? event.agentLabel
                        : "";
                    const tx =
                      "txHash" in event && typeof event.txHash === "string" ? event.txHash : null;
                    return (
                      <div
                        key={event.id}
                        className="px-5 py-3 flex items-baseline justify-between gap-4 font-mono text-xs"
                      >
                        <span className="w-40 shrink-0">
                          {EVENT_LABEL[event.kind] ?? event.kind}
                        </span>
                        <span className="flex-1 text-muted-foreground truncate">{who}</span>
                        <span className="tabular-nums">{amount !== null ? usdc(amount, 6) : ""}</span>
                        {tx ? (
                          <a
                            href={`${EXPLORER_TX}/${tx}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                          >
                            tx
                          </a>
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                          {new Date(event.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="lg:sticky lg:top-28">
            <DepositCard />
          </div>
        </div>
      </div>
    </main>
  );
}

export default AppPage;
