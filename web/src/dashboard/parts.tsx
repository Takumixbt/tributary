/*
 * Small shared pieces. Zone: src/dashboard/**.
 *
 * Nothing here is clever. It exists so that an amount, a panel label and a
 * waiting line are written once and look identical in nine panels.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useAgents } from "../data";
import { useTick } from "../kinetic";
import { shortAddress, splitAmount } from "../lib/format";
import type { Address, Micro } from "../lib/types";
import type { LabelLookup } from "./describe";

/**
 * A six-decimal amount with its sub-cent tail at 0.4 opacity. Opacity is this
 * product's syntax highlighting: it makes a 0.000350 USDC nanopayment scan as a
 * number instead of reading as noise.
 */
export function Amount({ value, tail = true }: { value: Micro; tail?: boolean }) {
  const parts = splitAmount(value);
  return (
    <span className="amount">
      {parts.int}.{parts.cents}
      {tail && parts.tail ? <span className="num-tail">{parts.tail}</span> : null}
    </span>
  );
}

export function PanelHead({ title, note }: { title: string; note?: string }) {
  return (
    <div className="p-head">
      <span className="p-title">{title}</span>
      {note ? <span className="p-note">{note}</span> : null}
    </div>
  );
}

/** Empty states are part of the design. Structure, a label, and a waiting line. */
export function Waiting({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** Ten steps of 100. A score you can read without reading the number. */
export function Meter({ score, steps = 10 }: { score: number; steps?: number }) {
  const filled = Math.round((Math.max(0, Math.min(1000, score)) / 1000) * steps);
  return (
    <span className="meter" aria-hidden="true">
      {Array.from({ length: steps }, (_, i) => (
        <span key={i} data-on={i < filled ? 1 : 0} />
      ))}
    </span>
  );
}

/** Agent labels, so no surface shows a raw address where a handle exists. */
export function useAgentLabels(): LabelLookup {
  const agents = useAgents();
  const labels = useMemo(() => {
    const map = new Map<Address, string>();
    for (const agent of agents) map.set(agent.address, agent.label);
    return map;
  }, [agents]);
  return useCallback<LabelLookup>((address) => labels.get(address) ?? shortAddress(address), [labels]);
}

/**
 * Whole seconds, from the shared clock. Relative timestamps on live surfaces
 * need to move, and this is one re-render per second for the subtree that asks,
 * instead of a timer per row.
 */
export function useSeconds(): number {
  const [second, setSecond] = useState(() => Math.floor(Date.now() / 1000));
  useTick(() => {
    const next = Math.floor(Date.now() / 1000);
    setSecond((current) => (current === next ? current : next));
  });
  return second;
}
