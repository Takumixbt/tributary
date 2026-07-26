/*
 * One reading in a panel. Zone: src/dashboard/**.
 *
 * Spec label above, mono value below, optional unit and note. The barbell rule
 * applies: the value is the loud part, the label is tiny, nothing sits between.
 */

import type { ReactNode } from "react";
import "./dashboard.css";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: string;
  align?: "left" | "right";
}

export function StatTile({ label, value, unit, note, align = "left" }: StatTileProps) {
  return (
    <div className="stat" data-align={align}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value}
        {unit ? <span className="num-unit">{unit}</span> : null}
      </span>
      {note ? <span className="stat-note">{note}</span> : null}
    </div>
  );
}

export default StatTile;
