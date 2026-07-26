import { useStreamHealth } from "../data";
import { ADDRESSES, DEMO_SEED, IS_DEMO, RPC_URL, hasChainConfig } from "../lib/env";
import { shortAddress } from "../lib/format";

/**
 * The status strip. Honesty as a design element, one hairline tall.
 *
 * Simulation mode says so, in plain spec mono, and names the seed driving the
 * choreography. Chain mode names the RPC and the vault it is reading, and admits
 * it when the reader goes quiet. Either way the viewer knows exactly what they
 * are looking at, and can switch to the other mode from here.
 */
export function ModeBanner() {
  const { status, note } = useStreamHealth();

  const host = (() => {
    try {
      return new URL(RPC_URL).host;
    } catch {
      return RPC_URL;
    }
  })();

  return (
    <div className="banner" role="status">
      <span className="banner-tag">{IS_DEMO ? "Simulation" : "Live"}</span>
      <span className="banner-sep">/</span>
      <span>Arc testnet</span>
      <span className="banner-sep">/</span>

      {IS_DEMO ? (
        <>
          <span>seed {DEMO_SEED}</span>
          <span className="banner-spacer" />
          <span className="banner-note">
            Deterministic replay of the full lend, earn, split, repay loop
          </span>
          {hasChainConfig ? (
            <a className="banner-link" href="?demo=0">
              Read the chain
            </a>
          ) : null}
        </>
      ) : (
        <>
          <span>{host}</span>
          <span className="banner-sep">/</span>
          <span>vault {shortAddress(ADDRESSES.vault ?? "0x0")}</span>
          <span className="banner-spacer" />
          <span className="banner-note">
            {status === "live"
              ? "Reading vault, registry and router events"
              : (note ?? `Stream ${status}`)}
          </span>
          <a className="banner-link" href="?demo=1">
            Run the simulation
          </a>
        </>
      )}
    </div>
  );
}

export default ModeBanner;
