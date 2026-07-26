/*
 * Motion constants and frame math. FROZEN: owned by the design lead.
 *
 * These numbers are the JS mirror of the --dur-* and --ease-* tokens. Canvas
 * work cannot read CSS custom properties cheaply, so it reads these instead.
 * If you change a duration here, change tokens.css in the same commit.
 */

export const DUR = {
  instant: 90,
  fast: 160,
  base: 260,
  slow: 480,
  /** White baseline flash decay on a new ledger row. */
  flash: 800,
  /** Camera pan/zoom between graph scenes. */
  camera: 900,
  /** Glyph-settle total duration on a rare high-signal change. */
  settle: 1200,
} as const;

/** Normalized easings, t in [0,1]. Mirror of the CSS cubic-beziers. */
export const EASE = {
  linear: (t: number) => t,
  /** cubic-bezier(0.16, 1, 0.3, 1) */
  out: (t: number) => 1 - Math.pow(1 - t, 4),
  /** cubic-bezier(0.65, 0, 0.35, 1) */
  inOut: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  /** Slight overshoot. Odometer digit travel, pulse birth. */
  spring: (t: number) => {
    const c = 1.42;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  /** Fast attack, long tail. Phosphor and flash decay. */
  decay: (t: number) => 1 - Math.pow(1 - t, 2.6),
} as const;

export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/**
 * Frame-rate independent approach. Use this instead of `lerp(a, b, 0.1)` in
 * every rAF loop, or the whole page moves at a different speed on a 144Hz
 * display. `halfLife` is the ms it takes to close half the remaining gap.
 */
export function damp(current: number, target: number, halfLife: number, dtMs: number): number {
  if (halfLife <= 0) return target;
  return target + (current - target) * Math.pow(2, -dtMs / halfLife);
}

/** Wrap a value into [0, span). Used by pulse travel and barber-pole offsets. */
export function wrap(value: number, span: number): number {
  return ((value % span) + span) % span;
}

/** Cheap deterministic 2D value noise. Per-node drift, dither field motion. */
export function noise2(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth 1D drift in [-1, 1] from a seed and a time. No allocation. */
export function drift(seed: number, t: number): number {
  return (
    0.6 * Math.sin(t * 0.31 + seed * 1.7) +
    0.3 * Math.sin(t * 0.73 + seed * 4.1) +
    0.1 * Math.sin(t * 1.37 + seed * 9.3)
  );
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_QUERY).matches;
}

/** Subscribe to the reduced-motion preference. Returns an unsubscribe. */
export function watchReducedMotion(onChange: (reduced: boolean) => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED_QUERY);
  const handler = (e: MediaQueryListEvent) => onChange(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/**
 * The global motion budget. 1 = full kinetics, 0 = reduced motion.
 * Reduced motion never removes information: pulses become instant opacity
 * blips, the dither field freezes, counters cross-fade instead of rolling.
 * Every data update stays visible.
 */
export function motionScaleFor(reduced: boolean): number {
  return reduced ? 0 : 1;
}
