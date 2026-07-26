/*
 * Live tape, laid sideways. Zone: src/pages/landing/**.
 *
 * The rail carries the tape on the terminal. On the landing page the same events
 * run across a single hairline strip directly under the hero, so the first thing
 * a reader sees below the claim is real traffic with real timestamps.
 */

import { useEvents } from "../../data";
import { Marquee } from "../../kinetic";
import { formatClock } from "../../lib/format";
import type { PaymentEvent } from "../../lib/types";
import { Amount } from "./Amount";

export function StatusStrip() {
  const rows = useEvents(["payment"], 10).filter((e): e is PaymentEvent => e.kind === "payment");

  return (
    <div className="strip">
      <Marquee speed={34}>
        {rows.length === 0 ? (
          <>
            <span className="strip-item">
              <span className="spec">Tape</span>
              <span>waiting for the first payment</span>
            </span>
            <span className="strip-tick">/</span>
            <span className="strip-item">
              <span className="spec">Columns</span>
              <span>time, buyer, service, amount</span>
            </span>
            <span className="strip-tick">/</span>
          </>
        ) : (
          rows.map((row) => (
            <span className="strip-item" key={row.id}>
              <span className="spec">{formatClock(row.at)}</span>
              <span>{row.buyerLabel}</span>
              <span className="strip-tick">/</span>
              <span>{row.service}</span>
              <Amount value={row.amount} unit />
            </span>
          ))
        )}
      </Marquee>
    </div>
  );
}

export default StatusStrip;
