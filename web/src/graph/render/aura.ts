/*
 * Score as dithered aura. Zone: src/graph/**.
 *
 * Each agent's credit score renders as a stippled halo: precomputed blue-noise
 * points masked to a radius, density proportional to score, thresholded through
 * the same 4x4 Bayer matrix the dither field uses. Score changes animate density,
 * which gives the underwriter a visible procedural fingerprint without a single
 * number on the canvas.
 *
 * The point sets are generated once per radius bucket and cached forever. A
 * per-frame blue-noise pass would cost more than the rest of the graph combined.
 */

import { clamp } from "../../lib/motion";
import { dither, ink } from "../../lib/paint";
import { projection, type Camera } from "../camera";
import type { GraphNode } from "../types";

const cache = new Map<string, Float32Array>();

/**
 * Mitchell best-candidate sampling in the unit disc. Not a true Poisson disc,
 * but visually indistinguishable at this scale and an order of magnitude cheaper.
 */
export function blueNoiseDisc(count: number, seed: number): Float32Array {
  const key = `${count}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const out = new Float32Array(count * 2);
  let state = (seed | 0) || 1;
  const rnd = () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return ((state >>> 8) & 0xffffff) / 0x1000000;
  };

  for (let i = 0; i < count; i += 1) {
    let bestX = 0;
    let bestY = 0;
    let bestScore = -1;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const angle = rnd() * Math.PI * 2;
      const radius = Math.sqrt(rnd());
      const cx = Math.cos(angle) * radius;
      const cy = Math.sin(angle) * radius;
      let nearest = Number.POSITIVE_INFINITY;
      for (let j = 0; j < i; j += 1) {
        const dx = cx - out[j * 2];
        const dy = cy - out[j * 2 + 1];
        const d = dx * dx + dy * dy;
        if (d < nearest) nearest = d;
      }
      if (nearest > bestScore) {
        bestScore = nearest;
        bestX = cx;
        bestY = cy;
      }
    }
    out[i * 2] = bestX;
    out[i * 2 + 1] = bestY;
  }

  cache.set(key, out);
  return out;
}

const POINTS = 132;

/**
 * Paint one agent's aura. Called for agents only, at most five per frame, and
 * every dot goes into a single path so the whole halo is one fill.
 */
export function drawScoreAura(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  camera: Camera,
  viewport: { width: number; height: number },
  alphaScale = 1,
): void {
  const score = node.score ?? 0;
  if (score <= 0 || alphaScale <= 0) return;

  const p = projection(camera, viewport);
  const cx = node.x * p.scale + p.ox;
  const cy = node.y * p.scale + p.oy;
  const radius = (node.radius * 2.9 + 10) * p.scale;
  if (radius < 6) return;
  if (cx < -radius || cx > viewport.width + radius) return;
  if (cy < -radius || cy > viewport.height + radius) return;

  const density = clamp(score / 1000, 0, 1);
  const used = Math.round(POINTS * (0.25 + density * 0.75));
  const points = blueNoiseDisc(POINTS, 1337);
  const intensity = 0.34 + density * 0.66;
  const alpha = (0.14 + density * 0.22 + node.heat * 0.12) * alphaScale * node.born;

  ctx.beginPath();
  let drawn = 0;
  for (let i = 0; i < used; i += 1) {
    const px = points[i * 2];
    const py = points[i * 2 + 1];
    // Denser toward the rim: a score reads as a shell, not a cloud.
    const r = 0.55 + 0.45 * Math.hypot(px, py);
    const x = cx + px * radius * r;
    const y = cy + py * radius * r;
    if (!dither(intensity, x | 0, y | 0)) continue;
    ctx.rect(x | 0, y | 0, 1, 1);
    drawn += 1;
  }
  if (drawn === 0) return;
  ctx.fillStyle = ink(1, clamp(alpha, 0, 0.5));
  ctx.fill();
}
