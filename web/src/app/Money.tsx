import { formatUnits } from "viem";

/**
 * Money on this page is written the way a person writes it. Six decimal places
 * are true but unreadable, so amounts round to cents unless they are genuinely
 * smaller than a cent, and the unit is spelled out rather than abbreviated.
 */
export function usd(value: bigint): string {
  const n = Number(formatUnits(value, 6));
  if (n === 0) return "0.00";
  if (n < 0.01) return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  if (n < 1000) return n.toFixed(2);
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** A rate as a person says it: "19.6% a year". */
export function yearlyRate(bps: number): string {
  return `${(bps / 100).toFixed(1)}% a year`;
}

/** A share as a person says it: "20% of every payment". */
export function share(bps: number): string {
  return `${Math.round(bps / 100)}%`;
}

export function Amount({ value, className }: { value: bigint; className?: string }) {
  return (
    <span className={className}>
      {usd(value)}
      <span className="text-muted-foreground"> USDC</span>
    </span>
  );
}
