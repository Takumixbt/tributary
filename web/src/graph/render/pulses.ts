/*
 * Pulse layer. Zone: src/graph/**. Painted on the front canvas, above content.
 *
 * Pure white cores with a short decaying tail. The only element in the entire
 * design allowed to sit at full #ffffff for more than one frame, which is why
 * everything else is rationed: if white were everywhere, the live layer would
 * stop reading as live.
 *
 * Under reduced motion a pulse never travels. It appears as a blip at both ends
 * of its edge and fades, so the event is still announced in the same place.
 */

import { clamp, EASE } from "../../lib/motion";
import { CANVAS, ink } from "../../lib/paint";
import { projection, type Camera } from "../camera";
import type { GraphWorld } from "../types";

const TAIL_STEPS = 3;
const TAIL_GAP = 3.4;

export function drawPulses(
  ctx: CanvasRenderingContext2D,
  world: GraphWorld,
  camera: Camera,
  viewport: { width: number; height: number },
  alphaScale = 1,
): void {
  if (alphaScale <= 0) return;
  const p = projection(camera, viewport);

  const cores: number[] = [];
  const tails: number[][] = [[], [], []];
  const blips: number[] = [];

  for (const pulse of world.pulses) {
    const edge = world.edges.get(pulse.edgeId);
    if (!edge) continue;
    const a = world.nodes.get(edge.from);
    const b = world.nodes.get(edge.to);
    if (!a || !b) continue;

    const ax = a.x * p.scale + p.ox;
    const ay = a.y * p.scale + p.oy;
    const bx = b.x * p.scale + p.ox;
    const by = b.y * p.scale + p.oy;
    // The ceiling rises with zoom. A flat cap would compress the 20/80 fork back
    // together at the repayment framing, which is the one moment the whole
    // product is built around.
    const radius = clamp(pulse.radius * (0.55 + p.scale * 0.5), 1, 4 + p.scale * 3);

    if (pulse.blip > 0) {
      const alpha = clamp(pulse.blip, 0, 1);
      blips.push(ax, ay, radius, alpha, bx, by, radius, alpha);
      continue;
    }

    const x = ax + (bx - ax) * pulse.t;
    const y = ay + (by - ay) * pulse.t;
    if (x < -20 || x > viewport.width + 20 || y < -20 || y > viewport.height + 20) continue;

    cores.push(x, y, radius);

    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = (dx / len) * pulse.dir;
    const uy = (dy / len) * pulse.dir;
    for (let s = 0; s < TAIL_STEPS; s += 1) {
      const back = TAIL_GAP * (s + 1);
      tails[s].push(x - ux * back, y - uy * back, radius * (1 - (s + 1) * 0.22));
    }
  }

  // Tails first, darkest last, so the core always sits on top.
  for (let s = TAIL_STEPS - 1; s >= 0; s -= 1) {
    const list = tails[s];
    if (list.length === 0) continue;
    const alpha = clamp((0.26 - s * 0.08) * alphaScale, CANVAS.pulseTailAlpha * 0.5, 1);
    ctx.fillStyle = ink(1, alpha);
    ctx.beginPath();
    for (let i = 0; i < list.length; i += 3) {
      const r = Math.max(0.6, list[i + 2]);
      ctx.moveTo(list[i] + r, list[i + 1]);
      ctx.arc(list[i], list[i + 1], r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  if (cores.length > 0) {
    ctx.fillStyle = ink(1, clamp(0.96 * alphaScale, 0, 1));
    ctx.beginPath();
    for (let i = 0; i < cores.length; i += 3) {
      ctx.moveTo(cores[i] + cores[i + 2], cores[i + 1]);
      ctx.arc(cores[i], cores[i + 1], cores[i + 2], 0, Math.PI * 2);
    }
    ctx.fill();
  }

  for (let i = 0; i < blips.length; i += 4) {
    ctx.fillStyle = ink(1, clamp(blips[i + 3] * 0.92 * alphaScale, 0, 1));
    ctx.beginPath();
    ctx.arc(blips[i], blips[i + 1], blips[i + 2], 0, Math.PI * 2);
    ctx.fill();
  }

  drawWaves(ctx, world, camera, viewport, alphaScale);
}

/**
 * Ring waves: debt cleared, a line opened, an agent joining. Rare events get an
 * expanding 1px ring, which is the loudest thing the graph ever does.
 */
function drawWaves(
  ctx: CanvasRenderingContext2D,
  world: GraphWorld,
  camera: Camera,
  viewport: { width: number; height: number },
  alphaScale: number,
): void {
  if (world.waves.length === 0) return;
  const p = projection(camera, viewport);
  ctx.lineWidth = 1;

  for (const wave of world.waves) {
    const t = clamp(wave.t, 0, 1);
    const radius = wave.maxRadius * EASE.out(t) * p.scale;
    if (radius < 1) continue;
    const x = wave.x * p.scale + p.ox;
    const y = wave.y * p.scale + p.oy;
    const alpha = clamp(Math.pow(1 - t, 1.6) * 0.6 * alphaScale, 0, 1);
    if (alpha < 0.01) continue;
    ctx.strokeStyle = ink(1, alpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
