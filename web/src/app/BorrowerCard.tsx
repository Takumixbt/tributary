import type { AgentState } from "../lib/types";
import { pct, usdc } from "./Money";

const EXPLORER = "https://testnet.arcscan.app/address";

function Term({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="font-mono text-base mt-1">{value}</div>
      {note ? <div className="text-xs text-muted-foreground mt-0.5">{note}</div> : null}
    </div>
  );
}

/**
 * A credit line, stated in the terms it is actually written in: limit,
 * principal, accrued interest, rate, and the share of revenue the router
 * withholds. The underwriter's own reasoning is printed verbatim, because it
 * is posted on chain next to the score and is the whole argument for the loan.
 */
export function BorrowerCard({ agent }: { agent: AgentState }) {
  const used = agent.limit > 0n ? Number((agent.debt * 10_000n) / agent.limit) / 100 : 0;
  const headroom = agent.limit > agent.debt ? agent.limit - agent.debt : 0n;

  return (
    <div className="border border-foreground/10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-6 lg:px-8 py-5 border-b border-foreground/10">
        <div className="flex items-baseline gap-4">
          <h3 className="text-lg font-display">{agent.label}</h3>
          <a
            href={`${EXPLORER}/${agent.address}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {agent.address.slice(0, 8)}…{agent.address.slice(-4)}
          </a>
          {agent.erc8004Id > 0 ? (
            <span className="font-mono text-xs text-muted-foreground">
              ERC-8004 #{agent.erc8004Id}
            </span>
          ) : null}
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wide">
            Score
          </span>
          <span className="font-mono text-2xl">{agent.score}</span>
          <span className="font-mono text-xs text-muted-foreground">/ 1000</span>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <Term label="Limit" value={`${usdc(agent.limit, 4)}`} note="USDC" />
        <Term label="Principal" value={`${usdc(agent.principal, 4)}`} note="drawn" />
        <Term
          label="Accrued"
          value={`${usdc(agent.accruedInterest, 6)}`}
          note="interest, per second"
        />
        <Term label="APR" value={pct(agent.aprBps)} note="simple, on principal" />
        <Term label="Repayment" value={pct(agent.repaymentBps, 0)} note="of gross revenue" />
        <Term label="Routed" value={usdc(agent.revenueTotal, 4)} note="lifetime revenue" />
        <Term label="Serviced" value={usdc(agent.repaidTotal, 4)} note="lifetime to vault" />
        <Term label="Headroom" value={usdc(headroom, 4)} note="left to draw" />
      </div>

      <div className="px-6 lg:px-8 pb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Utilization
          </span>
          <span className="font-mono text-xs">{used.toFixed(2)}%</span>
        </div>
        <div className="h-1 bg-foreground/10">
          <div
            className="h-full bg-foreground transition-[width] duration-700"
            style={{ width: `${Math.min(100, used)}%` }}
          />
        </div>
      </div>

      {agent.scoreReason ? (
        <p className="px-6 lg:px-8 pb-6 font-mono text-xs text-muted-foreground leading-relaxed">
          {agent.scoreReason}
        </p>
      ) : null}
    </div>
  );
}
