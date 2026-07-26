/*
 * Event to row. Zone: src/dashboard/**.
 *
 * The tape, the rail and the ledger all render the same eight event kinds, so
 * the wording lives here once. Codes are five characters or fewer because a tape
 * column that wraps stops being a tape.
 */

import { formatBps, formatUsdc } from "../lib/format";
import type { Address, EventKind, Micro, TributaryEvent } from "../lib/types";

export type LabelLookup = (address: Address) => string;

export const KIND_LABEL: Record<EventKind, string> = {
  payment: "PAY",
  split: "SPLIT",
  draw: "DRAW",
  repay: "REPAY",
  score: "SCORE",
  deposit: "LEND",
  cleared: "CLEAR",
  register: "JOIN",
};

/** Filter order in the ledger: money first, decisions second. */
export const KIND_ORDER: EventKind[] = [
  "payment",
  "split",
  "draw",
  "repay",
  "score",
  "deposit",
  "cleared",
  "register",
];

export const ACTION_LABEL: Record<string, string> = {
  opened: "OPENED",
  raised: "RAISED",
  held: "HELD",
  throttled: "THROTTLED",
  closed: "CLOSED",
};

export interface EventRow {
  actor: string;
  detail: string;
  amount: Micro | null;
}

/** How long a loan ran, in the coarsest unit that still says something. */
function duration(ms: number): string {
  const minutes = ms / 60_000;
  if (minutes < 1) return `${Math.max(1, Math.round(ms / 1000))}s`;
  if (minutes < 90) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 36) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function describeEvent(event: TributaryEvent, label: LabelLookup): EventRow {
  switch (event.kind) {
    case "payment":
      return {
        actor: label(event.agent),
        detail: `${event.buyerLabel} pays for ${event.service}`,
        amount: event.amount,
      };
    case "split":
      return {
        actor: label(event.agent),
        detail:
          event.repaymentBps > 0
            ? `flush splits ${formatBps(event.repaymentBps)} to the vault`
            : "flush passes through in full",
        amount: event.total,
      };
    case "draw":
      return {
        actor: label(event.agent),
        detail: `draws against the line for ${event.purpose}`,
        amount: event.amount,
      };
    case "repay":
      return {
        actor: label(event.agent),
        detail: `debt service lands, ${formatUsdc(event.debtAfter)} USDC outstanding`,
        amount: event.interestPaid + event.principalPaid,
      };
    case "score":
      return {
        actor: label(event.agent),
        detail: `${ACTION_LABEL[event.action] ?? "HELD"} at ${event.score}, limit ${formatUsdc(event.limit)} USDC`,
        amount: null,
      };
    case "deposit":
      return {
        actor: event.lenderLabel,
        detail: event.direction === "in" ? "lender adds liquidity" : "lender withdraws",
        amount: event.assets,
      };
    case "cleared":
      return {
        actor: label(event.agent),
        detail: `debt cleared across ${event.splitsToClear} splits over ${duration(event.durationMs)}`,
        amount: event.totalRepaid,
      };
    case "register":
      return {
        actor: event.label,
        detail: `registers a router, sells ${event.service}`,
        amount: null,
      };
  }
}
