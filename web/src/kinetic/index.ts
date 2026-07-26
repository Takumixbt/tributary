/*
 * Public API of the kinetic zone. The landing page and the dashboard both build
 * on these primitives, so the names and prop shapes are a contract.
 * Zone owner: kinetic builder.
 */

export { MotionProvider, useMotion, useTick } from "./MotionProvider";
export type { TickListener } from "./MotionProvider";

export { Odometer } from "./Odometer";
export type { OdometerProps } from "./Odometer";

export { Sparkline } from "./Sparkline";
export type { SparklineProps } from "./Sparkline";

export { HatchBar } from "./HatchBar";
export type { HatchBarProps } from "./HatchBar";

export { BorderCurrent } from "./BorderCurrent";
export type { BorderCurrentProps } from "./BorderCurrent";

export { DitherField } from "./DitherField";
export type { DitherFieldProps } from "./DitherField";

export { DotGrid } from "./DotGrid";
export type { DotGridProps } from "./DotGrid";

export { HairlineGrid } from "./HairlineGrid";
export type { HairlineGridProps } from "./HairlineGrid";

export { GlyphSettle } from "./GlyphSettle";
export type { GlyphSettleProps } from "./GlyphSettle";

export { WeightWave } from "./WeightWave";
export type { WeightWaveProps } from "./WeightWave";

export { Reveal } from "./Reveal";
export type { RevealProps } from "./Reveal";

/* The ledger tape rotated onto a wide row, for surfaces with no rail column. */
export { Marquee } from "./Marquee";
export type { MarqueeProps } from "./Marquee";
