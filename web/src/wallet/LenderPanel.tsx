import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { erc20Abi, vaultWriteAbi } from "../data/chain/abi";
import { ADDRESSES } from "../lib/env";
import { ConnectButton } from "./ConnectButton";
import { useWallet } from "./useWallet";

type Mode = "deposit" | "withdraw";

const EXPLORER_TX = "https://testnet.arcscan.app/tx";

function usdc(value: bigint, decimals = 6) {
  return Number(formatUnits(value, 6)).toFixed(decimals);
}

/**
 * The lender side of the desk, wired to the deployed vault. Deposit needs an
 * allowance first, so this runs approve then deposit and reports each step.
 * Withdrawals burn shares straight back to USDC.
 */
export function LenderPanel() {
  const wallet = useWallet();
  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "depositing" | "withdrawing">("idle");
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
    setStep("idle");
    setAmount("");
    setNote("Confirmed on Arc.");
    wallet.refresh();
    void allowance.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  const max = mode === "deposit" ? wallet.usdcBalance : wallet.shares;
  const overMax = parsed > max;
  const busy = signing || step !== "idle" || receipt.isLoading;

  async function submit() {
    if (!vault || parsed <= 0n || overMax) return;
    setNote(null);
    try {
      if (mode === "deposit") {
        const current = (allowance.data as bigint | undefined) ?? 0n;
        if (current < parsed) {
          setStep("approving");
          const approveHash = await writeContractAsync({
            address: ADDRESSES.usdc,
            abi: erc20Abi,
            functionName: "approve",
            args: [vault, parsed],
          });
          setHash(approveHash);
          setNote("Approval sent. Confirm the deposit next.");
          setStep("idle");
          return;
        }
        setStep("depositing");
        const depositHash = await writeContractAsync({
          address: vault,
          abi: vaultWriteAbi,
          functionName: "deposit",
          args: [parsed],
        });
        setHash(depositHash);
      } else {
        setStep("withdrawing");
        const withdrawHash = await writeContractAsync({
          address: vault,
          abi: vaultWriteAbi,
          functionName: "withdraw",
          args: [parsed],
        });
        setHash(withdrawHash);
      }
    } catch (error) {
      setStep("idle");
      const message = error instanceof Error ? error.message : "Transaction failed";
      setNote(message.split("\n")[0].slice(0, 160));
    }
  }

  if (!vault) {
    return (
      <div className="panel-empty">Contract addresses are not configured in this build.</div>
    );
  }

  return (
    <div className="lender">
      <div className="lender-tabs">
        {(["deposit", "withdraw"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setAmount("");
              setNote(null);
            }}
            className={`lender-tab${mode === m ? " is-active" : ""}`}
          >
            {m === "deposit" ? "Deposit" : "Withdraw"}
          </button>
        ))}
      </div>

      {!wallet.isConnected ? (
        <div className="lender-connect">
          <p className="lender-copy">
            Connect a wallet to lend USDC to agents that already earn, or to redeem a
            position you already hold.
          </p>
          <ConnectButton />
        </div>
      ) : wallet.wrongNetwork ? (
        <div className="lender-connect">
          <p className="lender-copy">This wallet is on another network.</p>
          <ConnectButton />
        </div>
      ) : (
        <>
          <div className="lender-field">
            <div className="lender-field-head">
              <span className="stat-label">{mode === "deposit" ? "Amount USDC" : "Shares"}</span>
              <button
                type="button"
                className="lender-max"
                onClick={() => setAmount(formatUnits(max, 6))}
              >
                Max {usdc(max, mode === "deposit" ? 4 : 6)}
              </button>
            </div>
            <input
              className="lender-input"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>

          <dl className="lender-rows">
            <div>
              <dt>Wallet</dt>
              <dd className="num">{usdc(wallet.usdcBalance, 4)} USDC</dd>
            </div>
            <div>
              <dt>Your position</dt>
              <dd className="num">{usdc(wallet.positionValue, 6)} USDC</dd>
            </div>
          </dl>

          <button
            type="button"
            className="lender-submit"
            disabled={busy || parsed <= 0n || overMax}
            onClick={submit}
          >
            {receipt.isLoading
              ? "Confirming"
              : step === "approving"
                ? "Approving"
                : signing
                  ? "Check your wallet"
                  : overMax
                    ? "Not enough balance"
                    : mode === "deposit"
                      ? "Deposit USDC"
                      : "Withdraw"}
          </button>

          {note ? <p className="lender-note">{note}</p> : null}
          {hash ? (
            <a
              className="lender-note lender-link"
              href={`${EXPLORER_TX}/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction
            </a>
          ) : null}
        </>
      )}
    </div>
  );
}
