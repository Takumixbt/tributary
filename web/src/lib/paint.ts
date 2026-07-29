/*
 * Canvas ink. FROZEN: owned by the design lead.
 *
 * The neutral ramp from tokens.css, as strings a 2D context can use, plus the
 * handful of canvas constants that keep every layer of the page reading as one
 * instrument. Canvas code must not invent its own grays.
 */

export const PAINT = {
  black: "#000000",
  n050: "#050505",
  n075: "#0a0a0a",
  n100: "#101010",
  n200: "#1c1c1c",
  n300: "#2b2b2b",
  n400: "#414141",
  n500: "#5c5c5c",
  n600: "#7d7d7d",
  n700: "#a3a3a3",
  n800: "#c9c9c9",
  n900: "#e8e8e8",
  ink: "#f4f4f4",
  white: "#ffffff",
} as const;

/**
 * Grayscale with alpha, on paper. `level` is emphasis, not luminance: 1 is the
 * strongest mark and renders black, 0 is the faintest and renders white. The
 * page is white, so ink darkens as it gets louder.
 */
export function ink(level: number, alpha = 1): string {
  const v = Math.round((1 - Math.max(0, Math.min(1, level))) * 255);
  return `rgba(${v},${v},${v},${Math.max(0, Math.min(1, alpha))})`;
}

/** Canvas layer constants. Tuned once, here. */
export const CANVAS = {
  /** Alpha of the black rect painted each frame instead of clearRect. */
  phosphorDecay: 0.12,
  /** Global hairline grid stroke. */
  gridAlpha: 0.06,
  gridStep: 64,
  /** Idle edge stroke. */
  edgeAlpha: 0.16,
  edgeAlphaHot: 0.34,
  /** Pulse core is pure white; its tail decays to this. */
  pulseTailAlpha: 0.08,
  /** Cap DPR: past 2 the cost is real and the gain is not. */
  dprCap: 2,
} as const;

/**
 * Size a canvas for the device pixel ratio and return the scale that was
 * applied. Call on mount, on resize, and whenever the DPR changes. The context
 * is reset to identity then scaled, so all drawing code works in CSS pixels.
 */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  dprCap = CANVAS.dprCap,
): number {
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const w = Math.max(1, Math.round(cssWidth * dpr));
  const h = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  return dpr;
}

/**
 * Ink persistence: paint translucent paper instead of clearing, so pulses leave
 * decaying trails behind them. Heavy traffic then reads as darker ink.
 */
export function phosphorClear(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  decay = CANVAS.phosphorDecay,
): void {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = `rgba(255,255,255,${decay})`;
  ctx.fillRect(0, 0, width, height);
}

/** 4x4 Bayer matrix, values 0-15. The hero dither threshold. */
export const BAYER4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
] as const;

/** Threshold a 0-1 intensity through the Bayer matrix at pixel (x, y). */
export function dither(intensity: number, x: number, y: number): 0 | 1 {
  const threshold = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  return intensity > threshold ? 1 : 0;
}

/**
 * Pulse radius from a payment amount. Nanopayments are logarithmic by nature:
 * a 0.0002 USDC payment must still register as a visible dot, and a 5 USDC
 * draw must not blot out the screen.
 */
export function pulseRadius(microAmount: number, min = 1.1, max = 4.6): number {
  const usdc = Math.max(microAmount, 1) / 1e6;
  const t = Math.log10(1 + usdc * 5000) / Math.log10(1 + 5 * 5000);
  return min + (max - min) * Math.max(0, Math.min(1, t));
}
