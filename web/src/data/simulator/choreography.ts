/*
 * The 90-second loop. Zone: src/data/**.
 *
 * Judges never see a demo twice, so the first pass has to contain the entire
 * thesis. The script guarantees it: a new agent joins, earns, gets scored, draws
 * credit, repays through the split, and clears, all inside 90 seconds, over a
 * continuous bed of background nanopayments from the other agents.
 *
 * Beats are seconds from the start of each loop. Background traffic never stops:
 * these are the scripted moments layered on top of it.
 *
 * STUB: the beat sheet is the design, the runner is not written yet.
 */

export type BeatKind =
  | "register"
  | "burst"
  | "score"
  | "draw"
  | "split-focus"
  | "throttle"
  | "clear"
  | "deposit";

export interface Beat {
  /** Seconds into the 90s loop. */
  at: number;
  kind: BeatKind;
  /** One line of intent, for the debug overlay. */
  note: string;
}

export const LOOP_SECONDS = 90;

export const BEATS: Beat[] = [
  { at: 2, kind: "deposit", note: "a lender tops up the vault" },
  { at: 6, kind: "register", note: "SENTRY-07 joins and its router is deployed" },
  { at: 10, kind: "burst", note: "first nanopayments arrive, score is still zero" },
  { at: 22, kind: "score", note: "underwriter posts 340 and opens a small line" },
  { at: 30, kind: "draw", note: "agent draws working capital for a GPU burst" },
  { at: 34, kind: "split-focus", note: "camera holds on the router fork, 20 / 80" },
  { at: 52, kind: "score", note: "clean service, limit raised and APR cut" },
  { at: 64, kind: "throttle", note: "one agent's inflows stall, its line is throttled" },
  { at: 78, kind: "clear", note: "debt clears, ring wave from the router" },
  { at: 86, kind: "burst", note: "full passthrough, the agent keeps every cent" },
];