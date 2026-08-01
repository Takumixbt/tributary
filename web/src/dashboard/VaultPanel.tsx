/*
 * Vault panel. Zone: src/dashboard/**.
 *
 * The lender's view. Total assets is the one rolling figure on the desk because
 * it is the number a lender checks first; everything under it is the arithmetic
 * behind it, and it updates plainly.
 *
 * Share price and interest earned run to six decimals because that is the scale
 * they move at. A book this size earning a mid-teens APR moves its share price
 * in the sixth decimal, and printing four would show a number that never
 * changes.
 */

import { Odometer, Sparkline } from "../kinetic";
import { useLenders, useVaultState } from "../data";
import {
  compactUsdc,
  formatBps,
  formatSharePrice,
  formatUsdc,
  padCount,
  toUsdcNumber,
} from "../lib/format";
import { StatTile } from "./StatTile";
import { PanelHead, Waiting } from "./parts";
import "./dashboard.css";

export function VaultPanel() {
  const vault = useVaultState();
  const lenders = useLenders();

  const empty = vault.totalShares === 0n;
  const position = lenders[0] ?? null;
  const positionShare =
    position && vault.totalShares > 0n ? Number((position.shares * 10_000n) / vault.totalShares) : 0;
  const utilization =
    vault.totalAssets > 0n
      ? Math.min(100, Number((vault.totalPrincipal * 10_000n) / vault.totalAssets) / 100)
      : 0;

  return (
    <div>
      {/* Lender count comes from deposit events seen since this page opened, so
          a fresh load legitimately does not know it yet. Better to say nothing
          than to print a zero next to a funded vault. */}
      <PanelHead
        title="Vault"
        note={vault.lenderCount > 0 ? `${padCount(vault.lenderCount)} lenders` : "Arc testnet"}
      />

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
              <span className="stat-note">USDC, lender capital plus outstanding principal</span>
            </div>
            <Sparkline
              className="vault-spark"
              values={vault.assetsSeries.values}
              width={124}
              height={40}
              live={false}
            />
          </div>

          <div className="vault-grid">
            <StatTile
              label="Available liquidity"
              value={formatUsdc(vault.availableLiquidity)}
              unit="USDC"
              note="drawable now"
            />
            <StatTile
              label="Share price"
              value={formatSharePrice(vault.sharePrice)}
              note="assets over shares"
            />
            <StatTile label="Lender yield" value={formatBps(vault.apyBps)} note="at current terms" />
            <StatTile
              label="Interest earned"
              value={formatUsdc(vault.interestEarned, { decimals: 6 })}
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
              value={formatUsdc(vault.repaidTotal)}
              unit="USDC"
              note={`${compactUsdc(vault.drawnTotal)} USDC drawn lifetime`}
            />
          </div>

          <div className="bar-block">
            <div className="bar-head">
              <span className="stat-label">Utilization</span>
              <span className="stat-value">{formatBps(vault.utilizationBps)}</span>
            </div>
            <div
              className="bar"
              role="img"
              aria-label={`Utilization ${formatBps(vault.utilizationBps)}`}
            >
              <span className="bar-fill" style={{ width: `${utilization}%` }} />
            </div>
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
