/*
 * Local widening of the frozen stream contract. Zone: src/data/**.
 *
 * `EventStream` in lib/types.ts is what every other zone codes against. Two
 * capabilities are producer-side only and deliberately live here instead:
 *
 *   tick()        the simulator has no clock of its own. MotionProvider owns the
 *                 app's single requestAnimationFrame loop, so the provider drives
 *                 simulated time from the same frame that paints it. A private
 *                 setInterval would let the tape and the graph drift apart.
 *   setFeatured() the roster can move the lens. The stream owns the snapshot, so
 *                 it also owns which agent the page is featuring.
 *
 * Both are optional: a stream that implements neither is still a valid producer.
 */

import type { Address, EventStream } from "../lib/types";

export interface TributaryStream extends EventStream {
  tick?(dtMs: number): void;
  setFeatured?(address: Address | null): void;
}
