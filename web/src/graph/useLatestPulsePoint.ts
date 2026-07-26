/*
 * Zone: src/graph/**.
 *
 * The screen position of the most recent payment pulse. The cursor-proximity
 * dot grid uses it as a stand-in cursor, so the interaction craft stays alive
 * during a hands-off demo or on touch.
 *
 * Returns a mutable ref, never state: this updates every frame and must not
 * cause React renders. The ref is a module singleton because there is exactly
 * one primary stage in the app, and a hook that minted a fresh ref per caller
 * would hand every consumer a ref nothing ever writes to.
 */

import type { MutableRefObject } from "react";

export type PulsePointRef = MutableRefObject<{ x: number; y: number } | null>;

const point: PulsePointRef = { current: null };

/** Engine side. Called once per frame by the primary stage only. */
export function publishPulsePoint(next: { x: number; y: number } | null): void {
  point.current = next;
}

export function useLatestPulsePoint(): PulsePointRef {
  return point;
}
