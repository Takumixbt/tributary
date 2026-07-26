/*
 * Shared formatters. FROZEN: owned by the design lead.
 *
 * Grayscale opacity is this product's syntax highlighting, so formatting is a
 * design decision, not a util. Use these instead of hand-rolling toFixed.
 */

import type { Address, Bps, Micro, Millis } from "./types";

/** U+2009 THIN SPACE. Digit grouping separator across the whole product. */
export const THIN = " ";
/** U+2007 FIGURE SPACE: same width as a digit, safe inside tabular columns. */
export const FIGURE = " ";
const MICRO = 1_000_000n;

function groupDigits(intDigits: string, group: boolean): string {
  if (!group || intDigits.length < 4) return intDigits;
  let out = "";
  for (let i = 0; i < intDigits.length; i++) {
    if (i > 0 && (intDigits.length - i) % 3 === 0) out += THIN;
    out += intDigits[i];
  }
  return out;
}

export interface UsdcOptions {
  /** Fixed decimal places, 0-6. Default 2. */
  decimals?: number;
  /** Thin-space grouping on the integer part. Default true. */
  group?: boolean;
  /** Force a leading + on positive values. Default false. */
  sign?: boolean;
}

/** `1234567n` -> `"1.23"`. `1234567890n` -> `"1 234.56"` (thin spaces). */
export function formatUsdc(value: Micro, options: UsdcOptions = {}): string {
  const { decimals = 2, group = true, sign = false } = options;
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / MICRO;
  const frac = abs % MICRO;
  const fracStr = frac.toString().padStart(6, "0").slice(0, Math.max(0, Math.min(6, decimals)));
  const prefix = negative ? "-" : sign ? "+" : "";
  return `${prefix}${groupDigits(whole.toString(), group)}${fracStr ? "." + fracStr : ""}`;
}

/**
 * Split an amount into the three visual weights a nanopayment needs.
 * `350n` (0.00035 USDC) -> { int: "0", cents: "00", tail: "035" }
 * Render int + cents at full opacity and tail at .num-tail. Six-decimal
 * amounts then scan at a glance instead of reading as noise.
 */
export function splitAmount(value: Micro): { int: string; cents: string; tail: string } {
  const abs = value < 0n ? -value : value;
  const digits = (abs % MICRO).toString().padStart(6, "0");
  return {
    int: groupDigits((abs / MICRO).toString(), true),
    cents: digits.slice(0, 2),
    tail: digits.slice(2).replace(/0+$/, ""),
  };
}

/** Headline-scale amounts: `1_240_000_000n` -> `"1.24K"`. */
export function compactUsdc(value: Micro): string {
  const n = toUsdcNumber(value);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (abs >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

/** Micro-USDC to a plain number of USDC. For charting math only. */
export function toUsdcNumber(value: Micro): number {
  return Number(value) / 1e6;
}

/** Plain USDC number to micro. Rounds, never truncates. */
export function toMicro(usdc: number): Micro {
  return BigInt(Math.round(usdc * 1e6));
}

/** `2000` -> `"20%"`. `1275` -> `"12.75%"`. */
export function formatBps(bps: Bps, maxDecimals = 2): string {
  const pct = bps / 100;
  const fixed = pct.toFixed(maxDecimals);
  return `${fixed.replace(/\.?0+$/, "")}%`;
}

/** `742` -> `"742"`. `40` -> `"040"`. Scores are always three columns wide. */
export function formatScore(score: number): string {
  return Math.max(0, Math.min(1000, Math.round(score))).toString().padStart(3, "0");
}

/** `7` -> `"007"`. Leading zeros are a design element, not padding. */
export function padCount(value: number, width = 3): string {
  return Math.max(0, Math.round(value)).toString().padStart(width, "0");
}

/** `"0x1f4c...9ab2"` with a real ellipsis. */
export function shortAddress(address: Address | string, head = 6, tail = 4): string {
  if (!address) return "0x0";
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/** `"14:22:09.481"`. The ledger tape's left column. */
export function formatClock(at: Millis): string {
  const d = new Date(at);
  const p = (n: number, w = 2) => n.toString().padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

/** `"4s"`, `"12m"`, `"3h"`, `"2d"`. Always two characters plus a unit. */
export function formatAgo(at: Millis, now: Millis = Date.now()): string {
  const s = Math.max(0, (now - at) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** `1.4` -> `"1.4"`, `142.6` -> `"143"`. Rates read as rates, not decimals. */
export function formatRate(perMin: number): string {
  if (perMin >= 100) return Math.round(perMin).toString();
  if (perMin >= 10) return perMin.toFixed(1);
  return perMin.toFixed(2);
}

/** Safe basis-points ratio. Returns 0 when the denominator is zero. */
export function bpsOf(part: Micro, whole: Micro): Bps {
  if (whole <= 0n) return 0;
  return Number((part * 10_000n) / whole);
}

/** Share price to a lender-facing string: `1_042_000n` -> `"1.042000"`. */
export function formatSharePrice(price: Micro): string {
  return formatUsdc(price, { decimals: 6, group: false });
}
