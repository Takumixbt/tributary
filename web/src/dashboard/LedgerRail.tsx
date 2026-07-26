/*
 * The persistent tape. Zone: src/dashboard/**.
 *
 * A 320px right-hand column that runs on every route, landing page included. It
 * is the product's pulse and the connective tissue between the story and the
 * terminal: the same payments that push the graph push these rows.
 *
 * New rows enter at the top with a pure-white baseline that decays to a hairline
 * over 800ms, and the DOM holds at most 50 rows however hard the stream runs. On
 * laptop widths the shell rotates this into a 96px bottom ticker, so nothing here
 * assumes a vertical container.
 */

import { useEventTape, useStats } from "../data";
import { formatClock, formatRate } from "../lib/format";
import { ANCHORS } from "../lib/stage";
import type { TributaryEvent } from "../lib/types";
import { useGraphAnchor } from "../graph";
import { KIND_LABEL, describeEvent, type LabelLookup } from "./describe";
import { Amount, Waiting, useAgentLabels } from "./parts";
import "./dashboard.css";

const RAIL_ROWS = 50;

function TapeRow({ event, label }: { event: TributaryEvent; label: LabelLookup }) {
  const row = describeEvent(event, label);
  return (
    <div className="tape-row">
      <span className="tape-time">{formatClock(event.at).slice(0, 8)}</span>
      <span className="tape-actor">
        <span className="tape-kind">{KIND_LABEL[event.kind]}</span>
        {row.actor}
      </span>
      <span className="tape-amount">{row.amount === null ? "" : <Amount value={row.amount} />}</span>
    </div>
  );
}

export function LedgerRail() {
  const anchor = useGraphAnchor(ANCHORS.ledgerRail, "vault", "left");
  const events = useEventTape(undefined, RAIL_ROWS);
  const stats = useStats();
  const label = useAgentLabels();

  return (
    <div className="rail" ref={anchor}>
      <div className="rail-head">
        <span className="spec">Live tape</span>
        <span className="rail-rate">
          {formatRate(stats.paymentsPerMin)}
          <span className="num-unit">per min</span>
        </span>
      </div>
      <div className="rail-body tape" aria-label="Live payment tape">
        {events.length === 0 ? (
          <Waiting>waiting for the first payment</Waiting>
        ) : (
          events.map((event) => <TapeRow key={event.id} event={event} label={label} />)
        )}
      </div>
    </div>
  );
}

export default LedgerRail;
