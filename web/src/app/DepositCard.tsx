import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { erc20Abi, vaultWriteAbi } from "../data/chain/abi";
import { ADDRESSES } from "../lib/env";
import { ARC_CHAIN_ID, ConnectButton, shortAddress, useWallet } from "../wallet";
import { usdc } from "./Money";

type Mode = "add" | "take";

const EXPLORER_TX = "https://testnet.arcscan.app/tx";

/**
 * Lender side. Deposit mints shares against total assets, withdraw burns them
 * back, and both are pinned to Arc so a wallet on another chain cannot sign
 * into a contract that does not exist there.
 */
export function DepositCard() {
  const wallet = useWallet();
  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const vault = ADDRESSES.vault as Address | undefined;

  const parsed = useMemo(() => {
    if (!amount.trim()) return 0n;
    try {
      return parseUnits(amount.trim(), 6);
    } catch {
      return 0n;
    }
  }, [amount]);

  const allowance = useReadContract({
    address: ADDRESSES.usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: wallet.address && vault ? [wallet.address, vault] : undefined,
    query: { enabled: Boolean(wallet.address && vault) && !wallet.wrongNetwork },
  });

  const { writeContractAsync, isPending: signing } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const receipt = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!receipt.isSuccess) return;
    setAmount("");
    setNote("Confirmed on Arc.");
    wallet.refresh();
    void allowance.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  const max = mode === "add" ? wallet.usdcBalance : wallet.shares;
  const overMax = parsed > max;
  const needsApproval =
    mode === "add" && parsed > 0n && ((allowance.data as bigint | undefined) ?? 0n) < parsed;
  const busy = signing || receipt.isLoading;

  async function submit() {
    if (!vault || parsed <= 0n || overMax) return;
    setNote(null);
    try {
      if (mode === "add") {
        if (needsApproval) {
          setHash(
            await writeContractAsync({
              chainId: ARC_CHAIN_ID,
              address: ADDRESSES.usdc,
              abi: erc20Abi,
              functionName: "approve",
              args: [vault, parsed],
            }),
          );
          setNote("Allowance set. Sign the deposit next.");
          return;
        }
        setHash(
          await writeContractAsync({
            chainId: ARC_CHAIN_ID,
            address: vault,
            abi: vaultWriteAbi,
            functionName: "deposit",
            args: [parsed],
          }),
        );
      } else {
        setHash(
          await writeContractAsync({
            chainId: ARC_CHAIN_ID,
            address: vault,
            abi: vaultWriteAbi,
            functionName: "withdraw",
            args: [parsed],
          }),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transaction failed";
      // A wallet rejection is a choice, not a failure worth shouting about.
      setNote(/rejected|denied/i.test(message) ? "Rejected in wallet." : message.split("\n")[0].slice(0, 140));
    }
  }

  const label = busy
    ? receipt.isLoading
      ? "Confirming"
      : "Check your wallet"
    : overMax
      ? "Exceeds balance"
      : mode === "add"
        ? needsApproval
          ? "Approve USDC"
          : "Deposit"
        : "Withdraw";

  return (
    <div className="border border-foreground/15 bg-background">
      <div className="flex">
        {(["add", "take"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setAmount("");
              setNote(null);
            }}
            className={`flex-1 py-4 font-mono text-xs uppercase tracking-wide transition-colors ${
              mode === m
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "add" ? "Deposit" : "Withdraw"}
          </button>
        ))}
      </div>

      <div className="p-6 lg:p-8">
        {!wallet.isConnected ? (
          <>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-6">
              Connect to supply USDC against agent revenue, or to redeem shares. Withdrawals
              are limited to idle liquidity.
            </p>
            <ConnectButton fullWidth />
          </>
        ) : wallet.wrongNetwork ? (
          <>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-6">
              Wrong network. Switch to Arc testnet before signing. Gas on Arc is paid in USDC.
            </p>
            <button
              type="button"
              onClick={() => wallet.switchToArc()}
              className="w-full h-14 rounded-full bg-foreground text-background text-base font-medium"
            >
              {wallet.switching ? "Check your wallet" : "Switch network"}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <label
                htmlFor="amount"
                className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground"
              >
                {mode === "add" ? "Amount USDC" : "Shares to burn"}
              </label>
              <button
                type="button"
                className="font-mono text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setAmount(formatUnits(max, 6))}
              >
                Max {usdc(max, mode === "add" ? 4 : 6)}
              </button>
            </div>
            <input
              id="amount"
              className="w-full h-16 px-4 border border-foreground/15 focus:border-foreground outline-none font-mono text-2xl bg-transparent"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            />

            <button
              type="button"
              onClick={submit}
              disabled={busy || parsed <= 0n || overMax}
              className="mt-4 w-full h-14 rounded-full bg-foreground text-background text-base font-medium disabled:opacity-30"
            >
              {label}
            </button>

            <dl className="mt-6 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Wallet USDC</dt>
                <dd className="tabular-nums">{usdc(wallet.usdcBalance, 6)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shares held</dt>
                <dd className="tabular-nums">{wallet.shares.toString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Position value</dt>
                <dd className="tabular-nums">{usdc(wallet.positionValue, 6)} USDC</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Account</dt>
                <dd>{shortAddress(wallet.address)}</dd>
              </div>
            </dl>
          </>
        )}

        {note ? <p className="mt-4 font-mono text-xs text-muted-foreground leading-relaxed">{note}</p> : null}
        {hash ? (
          <a
            className="mt-2 inline-block font-mono text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            href={`${EXPLORER_TX}/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        ) : null}
      </div>
    </div>
  );
}
