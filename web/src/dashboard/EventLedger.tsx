/*
 * Full event ledger. Zone: src/dashboard/**.
 *
 * Everything, newest first, with a kind filter: payments, splits, draws, debt
 * service, scores, deposits, clearances. It lives behind the Activity
 * disclosure, closed by default, because a desk that is always shouting its log
 * at you is harder to read, not more honest.
 *
 * The DOM holds 40 rows; the stream's ring buffer holds far more, and the
 * filter reads from that buffer rather than from what happens to be on screen.
 */

import { useMemo, useState } from "react";
import { useEventTape, useStats } from "../data";
import { compactUsdc, formatClock, padCount, shortAddress } from "../lib/format";
import type { EventKind } from "../lib/types";
import { KIND_LABEL, KIND_ORDER, describeEvent } from "./describe";
import { Amount, Waiting, useAgentLabels } from "./parts";
import "./dashboard.css";

const ROWS = 40;

export function EventLedger() {
  const [filter, setFilter] = useState<EventKind | null>(null);
  const kinds = useMemo(() => (filter ? [filter] : undefined), [filter]);
  const events = useEventTape(kinds, ROWS);
  const stats = useStats();
  const label = useAgentLabels();

  return (
    <div>
      <div className="led-head">
        <span className="p-note">
          {padCount(stats.paymentsTotal, 6)} payments / {compactUsdc(stats.volumeTotal)} USDC gross /{" "}
          {compactUsdc(stats.routedToVault)} USDC routed to the vault
        </span>
        <div className="led-filters">
          <button
            type="button"
            className="led-filter"
            aria-pressed={filter === null}
            onClick={() => setFilter(null)}
          >
            All
          </button>
          {KIND_ORDER.map((kind) => (
            <button
              key={kind}
              type="button"
              className="led-filter"
              aria-pressed={filter === kind}
              onClick={() => setFilter(kind)}
            >
              {KIND_LABEL[kind]}
            </button>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <Waiting>
          {filter ? `no ${KIND_LABEL[filter].toLowerCase()} events yet` : "waiting for the first event"}
        </Waiting>
      ) : (
        <div className="led-scroll">
          <div className="led-body">
            <div className="led-head-row" aria-hidden="true">
              <span>Time</span>
              <span>Kind</span>
              <span>Actor</span>
              <span>Detail</span>
              <span className="led-right">Amount USDC</span>
              <span className="led-right">Ref</span>
            </div>
            {events.map((event) => {
              const row = describeEvent(event, label);
              return (
                <div key={event.id} className="led-row" data-kind={event.kind}>
                  <span className="led-time">{formatClock(event.at)}</span>
                  <span className="led-kind">{KIND_LABEL[event.kind]}</span>
                  <span className="led-actor">{row.actor}</span>
                  <span className="led-detail">{row.detail}</span>
                  <span className="led-amount">
                    {row.amount === null ? "" : <Amount value={row.amount} />}
                  </span>
                  <span className="led-seq">
                    {event.txHash ? shortAddress(event.txHash, 4, 3) : `#${event.seq}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default EventLedger;
