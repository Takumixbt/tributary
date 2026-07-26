/*
 * Vault panel. Zone: src/dashboard/**.
 *
 * The lender's view. Total assets is the largest odometer on the page because it
 * is the only number a lender checks first; everything else is the arithmetic
 * behind it.
 *
 * Share price and interest earned run to six decimals because that is the scale
 * they move at. A book this size earning a mid-teens APR moves its share price in
 * the sixth decimal, and printing four would show a number that never changes.
 * Debt service received is the panel's fast number: it climbs on every flush.
 *
 * The graph's vault node terminates its edges on this panel's left border, and a
 * border current fires on every repayment, because a repayment is literally money
 * arriving here.
 */

import { BorderCurrent, HatchBar, Odometer, Sparkline } from "../kinetic";
import { useEventPulse, useLenders, useVaultState } from "../data";
import {
  compactUsdc,
  formatBps,
  formatSharePrice,
  formatUsdc,
  padCount,
  toUsdcNumber,
} from "../lib/format";
import { ANCHORS } from "../lib/stage";
import { useGraphAnchor } from "../graph";
import { StatTile } from "./StatTile";
import { PanelHead, Waiting } from "./parts";
import "./dashboard.css";

export function VaultPanel() {
  const anchor = useGraphAnchor(ANCHORS.vaultPanel, "vault", "left");
  const vault = useVaultState();
  const lenders = useLenders();
  const repayments = useEventPulse(["repay", "deposit"]);

  const empty = vault.totalShares === 0n;
  const position = lenders[0] ?? null;
  const positionShare =
    position && vault.totalShares > 0n ? Number((position.shares * 10_000n) / vault.totalShares) : 0;

  return (
    <div ref={anchor}>
      <BorderCurrent trigger={repayments} />
      <PanelHead title="Vault" note={`${padCount(vault.lenderCount)} lenders`} />

      {empty ? (
        <Waiting>waiting for the first deposit</Waiting>
      ) : (
        <>
          <div className="vault-hero">
            <div className="vault-hero-value">
              <span className="stat-label">Total assets</span>
              <Odometer
                className="vault-total"
                value={toUsdcNumber(vault.totalAssets)}
                decimals={2}
                label={`${formatUsdc(vault.totalAssets)} USDC of total assets`}
              />
            </div>
            <Sparkline
              className="vault-spark"
              values={vault.assetsSeries.values}
              width={124}
              height={40}
              live
            />
          </div>

          <div className="vault-grid">
            <StatTile
              label="Available liquidity"
              value={
                <Odometer
                  value={toUsdcNumber(vault.availableLiquidity)}
                  decimals={2}
                  label={`${formatUsdc(vault.availableLiquidity)} USDC available`}
                />
              }
              unit="USDC"
              note="drawable now"
            />
            <StatTile
              label="Share price"
              value={
                <Odometer
                  value={toUsdcNumber(vault.sharePrice)}
                  decimals={6}
                  group={false}
                  label={`${formatSharePrice(vault.sharePrice)} USDC per share`}
                />
              }
              note="assets over shares"
            />
            <StatTile
              label="Lender yield"
              value={formatBps(vault.apyBps)}
              note="at current terms"
            />
            <StatTile
              label="Interest earned"
              value={
                <Odometer
                  value={toUsdcNumber(vault.interestEarned)}
                  decimals={6}
                  label={`${formatUsdc(vault.interestEarned, { decimals: 6 })} USDC of interest earned`}
                />
              }
              unit="USDC"
              note="lifetime, to lenders"
            />
            <StatTile
              label="Outstanding principal"
              value={formatUsdc(vault.totalPrincipal)}
              unit="USDC"
              note={`across ${padCount(vault.agentsFunded)} agents`}
            />
            <StatTile
              label="Debt service received"
              value={
                <Odometer
                  value={toUsdcNumber(vault.repaidTotal)}
                  decimals={4}
                  label={`${formatUsdc(vault.repaidTotal)} USDC of debt service received`}
                />
              }
              unit="USDC"
              note={`${compactUsdc(vault.drawnTotal)} USDC drawn lifetime`}
            />
          </div>

          <div className="vault-util">
            <div className="vault-util-head">
              <span className="stat-label">Utilization</span>
              <span className="stat-value">{formatBps(vault.utilizationBps)}</span>
            </div>
            <HatchBar
              value={Number(vault.totalPrincipal)}
              max={Math.max(1, Number(vault.totalAssets))}
              mode="fill"
              activity={repayments}
              height={12}
              label={`Utilization ${formatBps(vault.utilizationBps)}`}
            />
          </div>

          {position ? (
            <div className="vault-position">
              <span className="stat-label">Position {position.label}</span>
              <span className="stat-value">
                {formatUsdc(position.value)}
                <span className="num-unit">USDC</span>
              </span>
              <span className="stat-note">{formatBps(positionShare)} of the pool</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default VaultPanel;
