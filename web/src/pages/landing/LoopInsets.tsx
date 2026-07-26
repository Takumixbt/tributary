/*
 * Live proof next to each claim. Zone: src/pages/landing/**.
 *
 * Every section of the credit loop states something and then shows the number
 * that backs it, read from the same event stream the graph and the terminal read.
 * These are not illustrations: kill the stream and they go to zero honestly.
 */

import { useEventPulse, useEvents, useFeaturedAgent, useStats, useVaultState } from "../../data";
import { BorderCurrent, GlyphSettle, HairlineGrid, HatchBar, Odometer, Sparkline } from "../../kinetic";
import {
  formatBps,
  formatClock,
  formatScore,
  formatUsdc,
  padCount,
  toUsdcNumber,
} from "../../lib/format";
import type { PaymentEvent, SplitEvent } from "../../lib/types";
import { Amount } from "./Amount";

const SECONDS_PER_YEAR = 31_536_000;

function Waiting({ text = "waiting for the first payment" }: { text?: string }) {
  return <span className="waiting">{text}</span>;
}

/* --------------------------------------------------------------- 01 revenue */

export function RevenueInset() {
  const rows = useEvents(["payment"], 4).filter((e): e is PaymentEvent => e.kind === "payment");
  const stats = useStats();
  const agent = useFeaturedAgent();

  return (
    <div className="inset inset-quad">
      <div className="inset-cell inset-span">
        <span className="spec">Inbound x402 calls</span>
        {rows.length === 0 ? (
          <Waiting />
        ) : (
          <div className="tape">
            {rows.map((row) => (
              <div className="tape-row" key={row.id}>
                <span className="tape-time">{formatClock(row.at)}</span>
                <span className="tape-actor">
                  {row.buyerLabel} {row.service}
                </span>
                <span className="tape-amount">
                  <Amount value={row.amount} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="inset-cell">
        <span className="spec">Payments / min</span>
        <Odometer
          className="inset-value"
          value={stats.paymentsPerMin}
          decimals={2}
          label={`${stats.paymentsPerMin.toFixed(2)} payments per minute`}
        />
        <Sparkline values={agent?.revenueSeries.values ?? []} width={132} height={26} />
      </div>

      <div className="inset-cell">
        <span className="spec">Smallest payment seen</span>
        <span className="inset-value">
          <Amount value={stats.smallestPayment} unit />
        </span>
        <span className="inset-sub">
          {padCount(stats.paymentsTotal, 4)} calls, {formatUsdc(stats.volumeTotal)} USDC gross
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- 02 score */

export function ScoreInset() {
  const agent = useFeaturedAgent();
  const score = agent?.score ?? 0;

  return (
    <div className="inset inset-quad">
      <div className="inset-cell inset-span">
        <span className="spec">{agent ? `${agent.label} score` : "Score"}</span>
        <GlyphSettle className="inset-value inset-value-lg" value={formatScore(score)} />
        <HatchBar
          value={score}
          max={1000}
          mode="fill"
          height={8}
          label={`score ${formatScore(score)} of 1000`}
        />
        <span className="inset-sub">0 to 1000, posted onchain with its reasoning</span>
      </div>

      <div className="inset-cell">
        <span className="spec">Limit</span>
        <Odometer
          className="inset-value"
          value={toUsdcNumber(agent?.limit ?? 0n)}
          decimals={2}
          suffix="USDC"
        />
      </div>

      <div className="inset-cell">
        <span className="spec">Repayment share</span>
        <span className="inset-value">{formatBps(agent?.repaymentBps ?? 2000)}</span>
        <span className="inset-sub">of every payment while debt is open</span>
      </div>

      <div className="inset-cell inset-span">
        <span className="spec">Underwriter, last pass</span>
        {agent?.scoreReason ? (
          <p className="inset-reason">{agent.scoreReason}</p>
        ) : (
          <Waiting text="waiting for the first underwriting pass" />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 03 credit */

export function CreditInset() {
  const agent = useFeaturedAgent();
  const vault = useVaultState();

  const debt = toUsdcNumber(agent?.debt ?? 0n);
  const apr = (agent?.aprBps ?? 0) / 10_000;
  const perSecond = (debt * apr) / SECONDS_PER_YEAR;

  return (
    <div className="inset inset-quad">
      <div className="inset-cell">
        <span className="spec">Drawn</span>
        <Odometer
          className="inset-value"
          value={toUsdcNumber(agent?.principal ?? 0n)}
          decimals={2}
          suffix="USDC"
        />
        <span className="inset-sub">limit {formatUsdc(agent?.limit ?? 0n)} USDC</span>
      </div>

      <div className="inset-cell">
        <span className="spec">APR</span>
        <span className="inset-value">{formatBps(agent?.aprBps ?? 0)}</span>
        <span className="inset-sub">priced off score, not collateral</span>
      </div>

      <div className="inset-cell">
        <span className="spec">Interest accrued</span>
        <Odometer
          className="inset-value"
          value={toUsdcNumber(agent?.accruedInterest ?? 0n)}
          decimals={6}
          accrualPerSecond={perSecond}
          suffix="USDC"
        />
        <span className="inset-sub">per second, straight into the share price</span>
      </div>

      <div className="inset-cell">
        <span className="spec">Share price</span>
        <Odometer
          className="inset-value"
          value={toUsdcNumber(vault.sharePrice)}
          decimals={6}
          group={false}
        />
        <span className="inset-sub">1.000000 at par</span>
      </div>

      <div className="inset-cell inset-span">
        <span className="spec">Vault utilization</span>
        <HatchBar
          value={toUsdcNumber(vault.totalPrincipal)}
          max={Math.max(toUsdcNumber(vault.totalAssets), 1)}
          mode="fill"
          height={10}
          label={`utilization ${formatBps(vault.utilizationBps)}`}
        />
        <span className="inset-sub">
          {formatBps(vault.utilizationBps)} lent out, {formatUsdc(vault.availableLiquidity)} USDC idle
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- 04 repayment */

export function RepaymentInset() {
  const agent = useFeaturedAgent();
  const stats = useStats();
  const splits = useEvents(["split"], 1).filter((e): e is SplitEvent => e.kind === "split");
  const repayPulse = useEventPulse(["repay"]);

  const latest = splits[0] ?? null;
  const bps = latest?.repaymentBps ?? agent?.repaymentBps ?? 2000;
  const share = Math.min(100, Math.max(0, bps / 100));

  return (
    <div className="inset inset-quad">
      <div className="inset-cell inset-span">
        <HairlineGrid step={32} axes={{ x: [share / 100] }} />
        <BorderCurrent trigger={repayPulse} />
        <div className="proof-total">
          <span className="spec">Last flush</span>
          <span className="inset-value">
            <Amount value={latest?.total ?? 0n} unit />
          </span>
        </div>
        <div className="proof-bar" role="img" aria-label={`${share} percent to the vault`}>
          <div className="proof-vault" style={{ width: `${share}%` }} />
          <div className="proof-agent" style={{ width: `${100 - share}%` }} />
          <div className="proof-divider" style={{ left: `${share}%` }} />
        </div>
        <div className="proof-legend">
          <div className="proof-leg">
            <span className="spec">To vault {formatBps(bps)}</span>
            <span className="proof-leg-value">
              <Amount value={latest?.toVault ?? 0n} />
            </span>
          </div>
          <div className="proof-leg is-agent">
            <span className="spec">To agent {formatBps(10_000 - bps)}</span>
            <span className="proof-leg-value">
              <Amount value={latest?.toAgent ?? 0n} />
            </span>
          </div>
        </div>
        {latest ? null : <Waiting text="waiting for the first flush" />}
      </div>

      <div className="inset-cell">
        <span className="spec">Debt outstanding</span>
        <Odometer
          className="inset-value"
          value={toUsdcNumber(agent?.debt ?? 0n)}
          decimals={2}
          suffix="USDC"
        />
        <HatchBar
          value={toUsdcNumber(agent?.debt ?? 0n)}
          max={Math.max(toUsdcNumber(agent?.limit ?? 0n), 1)}
          mode="drain"
          activity={repayPulse}
          height={10}
          label={`debt ${formatUsdc(agent?.debt ?? 0n)} USDC`}
        />
      </div>

      <div className="inset-cell">
        <span className="spec">Routed to vault</span>
        <Odometer
          className="inset-value"
          value={toUsdcNumber(stats.routedToVault)}
          decimals={2}
          suffix="USDC"
        />
        <span className="inset-sub">across {padCount(stats.splitsTotal, 3)} splits</span>
      </div>
    </div>
  );
}
