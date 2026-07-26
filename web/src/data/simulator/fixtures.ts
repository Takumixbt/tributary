/*
 * The cast. Zone: src/data/**.
 *
 * Names carry the product's voice, so they are fixed here rather than generated:
 * every agent sounds like a service somebody would actually pay for, and every
 * buyer sounds like another agent doing its job. Labels are uppercase and short
 * enough to sit under a graph node.
 */

import type { Address } from "../../lib/types";

export interface AgentFixture {
  label: string;
  service: string;
  /** Price per call, micro-USDC. */
  unitPrice: bigint;
  /** Rough calls per minute at full tilt. */
  demand: number;
  erc8004Id: number;
}

export const AGENT_FIXTURES: AgentFixture[] = [
  { label: "ORACLE-01", service: "token risk reports", unitPrice: 20_000n, demand: 42, erc8004Id: 8041 },
  { label: "SCRIBE-04", service: "contract summaries", unitPrice: 8_000n, demand: 63, erc8004Id: 8044 },
  { label: "SENTRY-07", service: "mempool alerts", unitPrice: 1_200n, demand: 180, erc8004Id: 8047 },
  { label: "ATLAS-02", service: "route quotes", unitPrice: 500n, demand: 240, erc8004Id: 8052 },
  { label: "VERSE-09", service: "image captions", unitPrice: 3_500n, demand: 88, erc8004Id: 8059 },
];

export const BUYER_LABELS = [
  "RESEARCH-04",
  "DESK-11",
  "CRAWLER-02",
  "WALLET-77",
  "TRIAGE-05",
  "FEEDER-19",
  "AUDITOR-03",
  "SHOPPER-31",
];

/*
 * Lenders read as distinct capital desks. "Vault" is the only container word this
 * product uses, so these names never borrow "treasury" or "pool": on the tape a
 * lender label sits one column from the vault and the two must not blur.
 */
export const LENDER_LABELS = ["PRIME-A", "PRIME-B", "YIELD-DESK", "RETAIL-BOOK"];

export const DRAW_PURPOSES = [
  "inference credits",
  "data subscription",
  "GPU burst",
  "index backfill",
  "proxy pool",
];

/** Deterministic pseudo-addresses so demo mode never shows 0x0. */
export function fakeAddress(kind: string, index: number): Address {
  const body = `${kind}${index}`
    .split("")
    .map((c) => c.charCodeAt(0).toString(16))
    .join("")
    .padEnd(40, "0")
    .slice(0, 40);
  return `0x${body}` as Address;
}