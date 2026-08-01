import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { erc20Abi, vaultWriteAbi } from "../data/chain/abi";
import { ADDRESSES } from "../lib/env";
import { ARC_CHAIN_ID, shortAddress, useWallet } from "../wallet";
import { usd } from "./Money";

type Mode = "add" | "take";

const EXPLORER_TX = "https://testnet.arcscan.app/tx";

/**
 * The one thing a visitor is here to do. Everything else on the page is
 * context for this card, so it says what happens in plain words, keeps a
 * single button lit at any moment, and never shows a step that is not the
 * next step.
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
    setNote(mode === "add" ? "Done. Your money is in the pool." : "Done. Your money is back in your wallet.");
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
          setNote("Permission granted. Press the button once more to add the money.");
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
      const message = error instanceof Error ? error.message : "Something went wrong";
      // Wallet rejections are a choice, not a failure worth shouting about.
      setNote(/rejected|denied/i.test(message) ? "Cancelled in your wallet." : message.split("\n")[0].slice(0, 140));
    }
  }

  const label = busy
    ? receipt.isLoading
      ? "Confirming"
      : "Check your wallet"
    : overMax
      ? "More than you have"
      : mode === "add"
        ? needsApproval
          ? "Allow, then add"
          : "Add money"
        : "Take money out";

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
            className={`flex-1 py-4 text-sm transition-colors ${
              mode === m
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "add" ? "Add money" : "Take out"}
          </button>
        ))}
      </div>

      <div className="p-6 lg:p-8">
        {!wallet.isConnected ? (
          <>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Connect a wallet to put money in. You can take it out again whenever it is
              not currently lent out.
            </p>
            <button
              type="button"
              onClick={() => wallet.connectFirst()}
              disabled={wallet.connecting}
              className="w-full h-14 rounded-full bg-foreground text-background text-base font-medium disabled:opacity-50"
            >
              {wallet.connecting ? "Check your wallet" : "Connect wallet"}
            </button>
          </>
        ) : wallet.wrongNetwork ? (
          <>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Your wallet is on a different network. Tributary runs on Arc, where fees are
              paid in USDC.
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
              <label htmlFor="amount" className="text-sm text-muted-foreground">
                {mode === "add" ? "How much" : "How much to take out"}
              </label>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setAmount(formatUnits(max, 6))}
              >
                You have {usd(mode === "add" ? wallet.usdcBalance : wallet.positionValue)}
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

            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">In the pool for you</dt>
                <dd className="font-mono">{usd(wallet.positionValue)} USDC</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Wallet</dt>
                <dd className="font-mono">{shortAddress(wallet.address)}</dd>
              </div>
            </dl>
          </>
        )}

        {note ? <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{note}</p> : null}
        {hash ? (
          <a
            className="mt-2 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            href={`${EXPLORER_TX}/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            See the receipt
          </a>
        ) : null}
      </div>
    </div>
  );
}
