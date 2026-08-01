import { useEffect, useState } from "react";
import { formatUnits } from "viem";

import { shortAddress, useWallet } from "./useWallet";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3 border-b border-foreground/10 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

/**
 * Wallet entry point for the header. Three states: not connected, connected on
 * the wrong network, connected on Arc. The panel is a plain dialog rather than
 * a wallet kit, so nothing here needs a project id or a third party script.
 */
export function ConnectButton({ compact = false }: { compact?: boolean }) {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Close the panel once a connection lands.
  useEffect(() => {
    if (wallet.isConnected && !wallet.wrongNetwork) setOpen(false);
  }, [wallet.isConnected, wallet.wrongNetwork]);

  const base =
    "font-mono border transition-all duration-300 rounded-full whitespace-nowrap " +
    (compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs");

  if (wallet.isConnected && wallet.wrongNetwork) {
    return (
      <button
        type="button"
        onClick={() => wallet.switchToArc()}
        className={`${base} border-foreground bg-foreground text-background hover:bg-foreground/90`}
      >
        {wallet.switching ? "Switching" : "Switch to Arc"}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${base} border-foreground/20 hover:border-foreground/60 hover:bg-foreground/5`}
      >
        {wallet.isConnected ? shortAddress(wallet.address) : "Connect wallet"}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Wallet"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md bg-background border border-foreground/15">
            <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
              <span className="font-display text-lg">
                {wallet.isConnected ? "Wallet" : "Connect a wallet"}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="px-6 py-5">
              {wallet.isConnected ? (
                <>
                  <Row label="Address" value={shortAddress(wallet.address)} />
                  <Row label="Network" value="Arc testnet" />
                  <Row
                    label="USDC"
                    value={Number(formatUnits(wallet.usdcBalance, 6)).toFixed(6)}
                  />
                  <Row
                    label="Vault position"
                    value={Number(formatUnits(wallet.positionValue, 6)).toFixed(6)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      wallet.disconnect();
                      setOpen(false);
                    }}
                    className="mt-6 w-full h-12 border border-foreground/20 font-mono text-xs hover:bg-foreground/5 transition-colors rounded-full"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                    Tributary runs on Arc testnet. Connect a browser wallet to deposit into
                    the vault or to read your own position. Nothing here touches mainnet
                    funds.
                  </p>
                  {wallet.connectors.length === 0 ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      No browser wallet detected. Install one and reload this page.
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {wallet.connectors.map((connector) => (
                        <button
                          key={connector.uid}
                          type="button"
                          onClick={() => wallet.connect({ connector })}
                          disabled={wallet.connecting}
                          className="w-full h-14 px-5 border border-foreground/15 hover:border-foreground/40 hover:bg-foreground/[0.03] transition-all flex items-center justify-between disabled:opacity-50"
                        >
                          <span className="font-medium">{connector.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {wallet.connecting ? "Waiting" : "Connect"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {wallet.connectError ? (
                    <p className="mt-4 font-mono text-xs text-muted-foreground">
                      {wallet.connectError.message.slice(0, 140)}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
