/*
 * Ordered-dither texture. Zone: src/kinetic/**.
 *
 * A slow radial gradient field rendered on a tiny offscreen canvas (160px wide),
 * thresholded per pixel through a 4x4 Bayer matrix, then upscaled with
 * image-rendering: pixelated. The field center drifts on low-frequency noise and
 * its intensity kicks briefly on each payment event. Cheap, strictly black and
 * white, and it shimmers like letterpress print texture come alive.
 *
 * Two lobes drift at different rates so the texture never reads as a loop. The
 * pixel loop writes a Uint32 view of the ImageData: 16k pixels a frame is cheap
 * only if there is no per-channel indexing. Off-screen instances stop entirely.
 */

import { memo, useEffect, useRef } from "react";
import { clamp, damp, drift } from "../lib/motion";
import { BAYER4 } from "../lib/paint";
import { useMotion, useTick } from "./MotionProvider";
import "./kinetic.css";

export interface DitherFieldProps {
  /** Base field intensity, 0-1. Default 0.5. */
  intensity?: number;
  /** Increment to kick the field brighter for ~200ms. Usually an event counter. */
  kick?: number;
  /** Offscreen buffer width in px. Keep it small: 120-200. */
  resolution?: number;
  className?: string;
}

function DitherFieldImpl({ intensity = 0.5, kick = 0, resolution = 160, className }: DitherFieldProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { motionScale } = useMotion();

  const buffer = useRef<{ image: ImageData; pixels: Uint32Array; w: number; h: number } | null>(null);
  const heat = useRef(0);
  const seen = useRef(kick);
  const visible = useRef(true);
  const painted = useRef(false);

  const kickRef = useRef(kick);
  kickRef.current = kick;
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;
  const reducedRef = useRef(motionScale === 0);
  reducedRef.current = motionScale === 0;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const w = Math.max(16, Math.round(resolution));
    const h = Math.max(10, Math.round(resolution * 0.62));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(w, h);
    buffer.current = { image, pixels: new Uint32Array(image.data.buffer), w, h };
    painted.current = false;
  }, [resolution]);

  // A hero-sized field that has scrolled away must not cost a frame.
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) visible.current = record.isIntersecting;
      },
      { rootMargin: "80px" },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useTick((dt, now) => {
    if (seen.current !== kickRef.current) {
      seen.current = kickRef.current;
      heat.current = clamp(heat.current + 0.5, 0, 1);
    }
    heat.current = damp(heat.current, 0, 150, dt);

    if (!visible.current) return;
    if (reducedRef.current && painted.current) return;

    const store = buffer.current;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!store || !canvas || !ctx) return;

    const { pixels, image, w, h } = store;
    const t = reducedRef.current ? 0 : now / 1000;
    const base = clamp(intensityRef.current + 0.28 * heat.current, 0, 1.4);

    const ax = w * (0.5 + 0.26 * drift(1.7, t * 0.09));
    const ay = h * (0.48 + 0.22 * drift(4.1, t * 0.07));
    const bx = w * (0.5 + 0.34 * drift(9.3, t * 0.05));
    const by = h * (0.52 + 0.3 * drift(2.6, t * 0.06));
    const reachA = 1 / (w * 0.62);
    const reachB = 1 / (w * 0.48);

    let i = 0;
    for (let y = 0; y < h; y++) {
      const bayerRow = (y & 3) * 4;
      const day = y - ay;
      const dby = y - by;
      for (let x = 0; x < w; x++, i++) {
        const dax = x - ax;
        const dbx = x - bx;
        const a = 1 - Math.sqrt(dax * dax + day * day) * reachA;
        const b = 1 - Math.sqrt(dbx * dbx + dby * dby) * reachB;
        const field = base * ((a > 0 ? a : 0) * 0.72 + (b > 0 ? b : 0) * 0.42);
        const threshold = (BAYER4[bayerRow + (x & 3)] + 0.5) / 16;
        pixels[i] = field > threshold ? 0xffffffff : 0;
      }
    }

    ctx.putImageData(image, 0, 0);
    painted.current = true;
  });

  return (
    <canvas ref={ref} className={`dither${className ? " " + className : ""}`} aria-hidden="true" />
  );
}

export const DitherField = memo(DitherFieldImpl);

export default DitherField;
