import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatUnits } from "viem";

import { shortAddress, useWallet } from "./useWallet";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3 border-b border-foreground/10 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm text-right">{value}</span>
    </div>
  );
}

/**
 * Wallet entry point for the header and lender card. The dialog is portalled to
 * document.body so transformed or blurred navigation containers can never clip
 * it or make fixed centering relative to the navigation instead of the viewport.
 */
export function ConnectButton({
  compact = false,
  fullWidth = false,
}: {
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Once the wallet is connected on Arc, return to the page it was opened from.
  useEffect(() => {
    if (wallet.isConnected && !wallet.wrongNetwork) setOpen(false);
  }, [wallet.isConnected, wallet.wrongNetwork]);

  const base =
    "font-mono border transition-all duration-300 rounded-full whitespace-nowrap disabled:opacity-60 " +
    (compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs") +
    (fullWidth ? " w-full h-14 flex items-center justify-center text-base font-medium" : "");

  const label = wallet.wrongNetwork
    ? wallet.switching
      ? "Check your wallet"
      : "Switch to Arc"
    : wallet.isConnected
      ? shortAddress(wallet.address)
      : wallet.connecting
        ? "Check your wallet"
        : "Connect wallet";

  const openWallet = () => {
    if (wallet.wrongNetwork) {
      wallet.switchToArc();
      return;
    }
    setOpen(true);
  };

  const dialog = open ? (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-dialog-title"
    >
      <button
        type="button"
        aria-label="Close wallet dialog"
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm cursor-default"
        onClick={() => setOpen(false)}
      />
      <section className="relative z-10 w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto bg-background border border-foreground/15 shadow-2xl">
        <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between gap-4">
          <span id="wallet-dialog-title" className="font-display text-lg">
            {wallet.isConnected ? "Wallet" : "Connect a wallet"}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5">
          {wallet.isConnected ? (
            wallet.wrongNetwork ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your wallet is connected on another network. Switch it to Arc testnet before
                  depositing, withdrawing, or reading your position.
                </p>
                <button
                  type="button"
                  onClick={() => wallet.switchToArc()}
                  disabled={wallet.switching}
                  className="mt-6 w-full h-12 rounded-full bg-foreground text-background font-medium disabled:opacity-60"
                >
                  {wallet.switching ? "Check your wallet" : "Switch to Arc testnet"}
                </button>
              </>
            ) : (
              <>
                <Row label="Address" value={shortAddress(wallet.address)} />
                <Row label="Network" value="Arc testnet" />
                <Row label="USDC" value={Number(formatUnits(wallet.usdcBalance, 6)).toFixed(6)} />
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
            )
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Choose the browser wallet you want to use. Tributary only asks to connect; no
                transaction is requested until you choose Deposit or Withdraw.
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
                      className="w-full min-h-14 px-5 border border-foreground/15 hover:border-foreground/40 hover:bg-foreground/[0.03] transition-all flex items-center justify-between disabled:opacity-50"
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
                <p className="mt-4 font-mono text-xs text-muted-foreground" aria-live="polite">
                  {wallet.connectError.message.slice(0, 140)}
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openWallet}
        disabled={wallet.connecting || wallet.switching}
        className={`${base} ${
          wallet.wrongNetwork
            ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
            : "border-foreground/20 hover:border-foreground/60 hover:bg-foreground/5"
        }`}
      >
        {label}
      </button>
      {typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
    </>
  );
}
