import { formatUnits } from "viem";

/**
 * Amounts keep six decimals. This protocol settles sub-cent payments, so
 * rounding to cents would hide the thing that makes it work.
 */
export function usdc(value: bigint, decimals = 6): string {
  return Number(formatUnits(value, 6)).toFixed(decimals);
}

/** Basis points as a percentage, two places. */
export function pct(bps: number, decimals = 2): string {
  return `${(bps / 100).toFixed(decimals)}%`;
}

/** Share price is carried at 1e6, and moves in the sixth decimal. */
export function sharePrice(value: bigint): string {
  return Number(formatUnits(value, 6)).toFixed(6);
}

export function shortHash(value: string): string {
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}
