/*
 * Node layer. Zone: src/graph/**.
 *
 * Shape is the only identity channel in a monochrome system:
 *   buyer agent   hollow 1px-stroke circle
 *   seller agent  solid white disc, radius by revenue velocity
 *   router        45-degree rotated square outline
 *   vault         concentric double rings
 *   lender        small filled square
 *   underwriter   1px crosshair
 *
 * Labels are 10px uppercase spec mono and appear only for hovered or featured
 * nodes. Three labels on a live system reads better than thirty on a diagram.
 * Delinquent nodes render outline-only with a slow 2s blink; throttled nodes get
 * a small nervous jitter. Credit health never uses colour, because there is none.
 */

import { clamp } from "../../lib/motion";
import { ink } from "../../lib/paint";
import { projection, type Camera } from "../camera";
import { drawScoreAura } from "./aura";
import type { GraphNode, GraphWorld } from "../types";

export interface NodeStyle {
  node?: number;
  aura?: number;
  labels?: boolean;
  /** back paints the economy; front paints the featured node and the labels. */
  layer?: "back" | "front";
}

const LABEL_FONT = '500 10px "Martian Mono", "IBM Plex Mono", ui-monospace, monospace';

function jitterOf(node: GraphNode, time: number): number {
  if (node.jitter <= 0) return 0;
  return Math.sin(time * 9.1 + node.seed) * node.jitter;
}

/** Delinquent nodes blink on a 2s period. Slow enough to read as a warning. */
function blinkOf(node: GraphNode, time: number): number {
  if (node.health !== "delinquent") return 1;
  return 0.42 + 0.38 * (0.5 + 0.5 * Math.sin((time * Math.PI * 2) / 2));
}

export function drawNodes(
  ctx: CanvasRenderingContext2D,
  world: GraphWorld,
  camera: Camera,
  viewport: { width: number; height: number },
  style: NodeStyle = {},
): void {
  const scaleAlpha = style.node ?? 1;
  const layer = style.layer ?? "back";
  const front = layer === "front";
  const p = projection(camera, viewport);
  const time = world.time;
  const margin = 60;

  // Auras sit under everything, on the back layer only.
  if (!front && (style.aura ?? 1) > 0) {
    for (const node of world.nodes.values()) {
      if (node.role !== "agent") continue;
      drawScoreAura(ctx, node, camera, viewport, style.aura ?? 1);
    }
  }

  const buyers: number[] = [];
  const lenders: number[] = [];
  let buyerAlpha = 0;
  let buyerCount = 0;

  for (const node of world.nodes.values()) {
    if (node.role === "anchor") continue;
    // Back paints the economy. Front paints the featured node and any router
    // mid-split, so the fork flash is never hidden behind a content panel.
    const frontSubject = node.featured || (node.role === "router" && node.flash > 0.04);
    if (front && !frontSubject) continue;
    if (!front && node.featured) continue;

    const jx = jitterOf(node, time);
    const x = node.x * p.scale + p.ox + jx;
    const y = node.y * p.scale + p.oy;
    if (x < -margin || x > viewport.width + margin) continue;
    if (y < -margin || y > viewport.height + margin) continue;

    const r = Math.max(1.4, node.radius * p.scale * (0.6 + 0.4 * node.born));
    const heat = clamp(node.heat, 0, 1.4);
    const blink = blinkOf(node, time);
    const dim = node.scaffold ? 0.45 : 1;
    const base = clamp((0.4 + heat * 0.5) * scaleAlpha * dim * blink * node.born, 0, 1);

    switch (node.role) {
      case "buyer": {
        buyers.push(x, y, r);
        buyerAlpha += base;
        buyerCount += 1;
        break;
      }
      case "lender": {
        lenders.push(x, y, Math.max(2, 4 * p.scale));
        break;
      }
      case "agent": {
        const outlineOnly = node.health === "delinquent";
        const alpha = clamp((0.62 + heat * 0.38) * scaleAlpha * dim * blink * node.born, 0, 1);
        if (outlineOnly) {
          ctx.strokeStyle = ink(1, alpha);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = ink(1, alpha);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        if (node.featured) {
          // The one node allowed to hold pure white, plus a hairline ring.
          ctx.fillStyle = ink(1, clamp(0.85 + heat * 0.15, 0, 1) * scaleAlpha);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = ink(1, 0.28 * scaleAlpha);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, r + 7, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case "router": {
        const half = Math.max(3, 4.5 * p.scale);
        ctx.strokeStyle = ink(1, clamp(base + 0.18, 0, 1));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - half);
        ctx.lineTo(x + half, y);
        ctx.lineTo(x, y + half);
        ctx.lineTo(x - half, y);
        ctx.closePath();
        ctx.stroke();
        if (node.flash > 0.04) {
          // The split flash. One frame of pure white, then it is gone.
          ctx.fillStyle = ink(1, clamp(node.flash, 0, 1));
          ctx.fill();
        }
        break;
      }
      case "vault": {
        const outer = Math.max(6, 20 * p.scale);
        const inner = Math.max(4, 14 * p.scale);
        ctx.lineWidth = 1;
        ctx.strokeStyle = ink(1, clamp(0.34 + heat * 0.4, 0, 1) * scaleAlpha * dim);
        ctx.beginPath();
        ctx.arc(x, y, outer, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = ink(1, clamp(0.5 + heat * 0.5, 0, 1) * scaleAlpha * dim);
        ctx.beginPath();
        ctx.arc(x, y, inner, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "underwriter": {
        const arm = Math.max(4, 6 * p.scale);
        ctx.strokeStyle = ink(1, clamp(0.34 + heat * 0.5, 0, 1) * scaleAlpha * dim);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - arm, y);
        ctx.lineTo(x + arm, y);
        ctx.moveTo(x, y - arm);
        ctx.lineTo(x, y + arm);
        ctx.stroke();
        ctx.fillStyle = ink(1, clamp(0.5 + heat * 0.5, 0, 1) * scaleAlpha * dim);
        ctx.fillRect(x - 1, y - 1, 2, 2);
        break;
      }
      default:
        break;
    }
  }

  if (buyerCount > 0) {
    ctx.strokeStyle = ink(1, clamp((buyerAlpha / buyerCount) * 1.15, 0.08, 0.9));
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < buyers.length; i += 3) {
      const r = buyers[i + 2];
      ctx.moveTo(buyers[i] + r, buyers[i + 1]);
      ctx.arc(buyers[i], buyers[i + 1], r, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  if (lenders.length > 0) {
    ctx.fillStyle = ink(1, 0.5 * scaleAlpha);
    ctx.beginPath();
    for (let i = 0; i < lenders.length; i += 3) {
      const side = lenders[i + 2];
      ctx.rect(lenders[i] - side / 2, lenders[i + 1] - side / 2, side, side);
    }
    ctx.fill();
  }

  if (front && (style.labels ?? true)) drawLabels(ctx, world, camera, viewport);
}

/**
 * Labels for the hovered and featured nodes only, drawn on the front layer with
 * a short leader line so they read as an annotation on a drawing.
 */
function drawLabels(
  ctx: CanvasRenderingContext2D,
  world: GraphWorld,
  camera: Camera,
  viewport: { width: number; height: number },
): void {
  const p = projection(camera, viewport);
  ctx.font = LABEL_FONT;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  for (const node of world.nodes.values()) {
    if (node.labelHold < 0.02 || node.role === "anchor") continue;
    const x = node.x * p.scale + p.ox;
    const y = node.y * p.scale + p.oy;
    if (x < 0 || x > viewport.width || y < 0 || y > viewport.height) continue;

    const r = Math.max(4, node.radius * p.scale);
    const gap = r + 8;
    const alpha = clamp(node.labelHold, 0, 1);

    ctx.strokeStyle = ink(1, 0.24 * alpha);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + r + 2, y);
    ctx.lineTo(x + gap, y);
    ctx.stroke();

    ctx.fillStyle = ink(1, 0.62 * alpha);
    ctx.fillText(node.label, x + gap + 4, y + 0.5);
  }
}
