/*
 * Public API of the kinetic zone. The landing page and the terminal both build
 * on these primitives, so the names and prop shapes are a contract.
 *
 * Design direction v2 keeps four of them. Motion in this product is now a
 * reveal, a rolling headline figure, a hairline chart and one marquee.
 */

export { MotionProvider, useMotion, useTick } from "./MotionProvider";
export type { TickListener } from "./MotionProvider";

export { Odometer } from "./Odometer";
export type { OdometerProps } from "./Odometer";

export { Sparkline } from "./Sparkline";
export type { SparklineProps } from "./Sparkline";

export { Reveal } from "./Reveal";
export type { RevealProps } from "./Reveal";

/* The one moving strip in the product: the hero's stat marquee. */
export { Marquee } from "./Marquee";
export type { MarqueeProps } from "./Marquee";
