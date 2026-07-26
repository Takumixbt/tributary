/*
 * Edge layer. Zone: src/graph/**. Painted on the back canvas.
 *
 * Healthy lines solid at 0.16 alpha, hot lines up to 0.34, throttled credit
 * lines dashed with a slow crawl. Weight rises with traffic and decays every
 * frame, so a busy route visibly thickens during a burst.
 *
 * Everything here is batched: strokes are grouped by quantised alpha, width and
 * dash pattern, so forty edges cost a handful of stroke calls instead of forty.
 */

import { clamp } from "../../lib/motion";
import { CANVAS, ink } from "../../lib/paint";
import { projection, type Camera } from "../camera";
import type { GraphEdge, GraphWorld } from "../types";

export interface EdgeStyle {
  /** Multiplier on edge alpha. */
  edge?: number;
  /** Multiplier on anchor connector alpha. */
  connector?: number;
}

/*
 * Reused across frames: batching must not allocate. Keys are integers, not
 * template strings, because this runs 45 times a frame and the strings were pure
 * garbage. Layout: (alphaStep * WIDTH_STEPS + widthStep) * 2 + dash.
 */
const ALPHA_STEP = 0.015;
const ALPHA_STEPS = 32;
const WIDTH_STEPS = 8;
const batches = new Map<number, number[]>();
const free: number[][] = [];

function bucket(key: number): number[] {
  let list = batches.get(key);
  if (!list) {
    list = free.pop() ?? [];
    list.length = 0;
    batches.set(key, list);
  }
  return list;
}

function releaseAll(): void {
  for (const list of batches.values()) free.push(list);
  batches.clear();
}

function edgeAlpha(edge: GraphEdge, scaffold: boolean): number {
  const base = CANVAS.edgeAlpha * edge.rest;
  const hot = base + edge.weight * 0.16;
  return clamp(hot, 0, CANVAS.edgeAlphaHot) * (scaffold ? 0.5 : 1);
}

export function drawEdges(
  ctx: CanvasRenderingContext2D,
  world: GraphWorld,
  camera: Camera,
  viewport: { width: number; height: number },
  style: EdgeStyle = {},
): void {
  const scale = style.edge ?? 1;
  if (scale <= 0) return;
  const p = projection(camera, viewport);
  const margin = 80;
  const crawl = -(world.time * 12) % 8;

  for (const edge of world.edges.values()) {
    if (edge.kind === "anchor") continue;
    const a = world.nodes.get(edge.from);
    const b = world.nodes.get(edge.to);
    if (!a || !b) continue;

    const ax = a.x * p.scale + p.ox;
    const ay = a.y * p.scale + p.oy;
    const bx = b.x * p.scale + p.ox;
    const by = b.y * p.scale + p.oy;

    if (Math.max(ax, bx) < -margin || Math.min(ax, bx) > viewport.width + margin) continue;
    if (Math.max(ay, by) < -margin || Math.min(ay, by) > viewport.height + margin) continue;

    const scaffold = a.scaffold || b.scaffold;
    const alphaStep = Math.min(
      ALPHA_STEPS - 1,
      Math.round((edgeAlpha(edge, scaffold) * scale) / ALPHA_STEP),
    );
    if (alphaStep < 1) continue;
    const widthStep = Math.min(WIDTH_STEPS - 1, Math.round(Math.min(0.9, edge.weight * 0.5) / 0.25));
    const born = Math.min(a.born, b.born);

    const list = bucket((alphaStep * WIDTH_STEPS + widthStep) * 2 + (edge.dashed ? 1 : 0));
    if (born >= 1) {
      list.push(ax, ay, bx, by);
    } else {
      // A new node's edges grow out of the node rather than appearing whole.
      list.push(ax, ay, ax + (bx - ax) * born, ay + (by - ay) * born);
    }
  }

  ctx.lineCap = "butt";
  for (const [key, list] of batches) {
    if (list.length === 0) continue;
    const dashed = key % 2;
    const rest = (key - dashed) / 2;
    const widthStep = rest % WIDTH_STEPS;
    const alphaStep = (rest - widthStep) / WIDTH_STEPS;
    ctx.strokeStyle = ink(1, alphaStep * ALPHA_STEP);
    ctx.lineWidth = 1 + widthStep * 0.25;
    if (dashed === 1) {
      ctx.setLineDash([3, 5]);
      ctx.lineDashOffset = crawl;
    } else {
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
    ctx.beginPath();
    for (let i = 0; i < list.length; i += 4) {
      ctx.moveTo(list[i], list[i + 1]);
      ctx.lineTo(list[i + 2], list[i + 3]);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  releaseAll();
}

/**
 * Anchor connectors, on the front layer. These are the wires that leave the
 * simulation and terminate on a real panel border, so they are drawn above the
 * content and they end in a small engineering tick rather than a point.
 */
export function drawConnectors(
  ctx: CanvasRenderingContext2D,
  world: GraphWorld,
  camera: Camera,
  viewport: { width: number; height: number },
  alphaScale = 1,
): void {
  if (alphaScale <= 0) return;
  const p = projection(camera, viewport);
  const drift = -(world.time * 26) % 10;

  ctx.setLineDash([2, 8]);
  ctx.lineDashOffset = drift;
  ctx.lineWidth = 1;

  for (const edge of world.edges.values()) {
    if (edge.kind !== "anchor") continue;
    const a = world.nodes.get(edge.from);
    const b = world.nodes.get(edge.to);
    if (!a || !b) continue;
    const ax = a.x * p.scale + p.ox;
    const ay = a.y * p.scale + p.oy;
    const bx = b.x * p.scale + p.ox;
    const by = b.y * p.scale + p.oy;
    const alpha = clamp((0.14 + edge.weight * 0.24) * alphaScale * b.born, 0, 0.5);

    ctx.strokeStyle = ink(1, alpha);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // Terminal tick: 7px cross at the panel border, brighter on arrival.
    const flash = clamp(b.flash, 0, 1);
    ctx.strokeStyle = ink(1, clamp(0.3 + flash * 0.7, 0, 1) * alphaScale);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(bx - 3.5, by);
    ctx.lineTo(bx + 3.5, by);
    ctx.moveTo(bx, by - 3.5);
    ctx.lineTo(bx, by + 3.5);
    ctx.stroke();
    ctx.setLineDash([2, 8]);
    ctx.lineDashOffset = drift;
  }

  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}
