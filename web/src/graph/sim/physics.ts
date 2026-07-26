/*
 * Anchored physics. Zone: src/graph/**.
 *
 * Velocity Verlet on a fixed 60Hz substep, damping 0.85, weak repulsion, spring
 * edges, plus soft pin forces that keep buyers left, sellers center, router and
 * vault right. The topology has to read left to right as a sentence: earn,
 * split, repay. A little per-node drift keeps it from ever fully sleeping.
 *
 * Two decisions worth stating. First, the substep is fixed, so the layout is
 * identical at 60Hz and 144Hz and a stalled tab cannot explode the springs.
 * Second, every node keeps its pin: this is a diagram that breathes, not a
 * free-floating force graph, because the left-to-right reading is the product's
 * whole explanation of itself.
 */

import { clamp, damp, drift } from "../../lib/motion";
import type { EdgeKind, GraphNode, GraphWorld } from "../types";

export interface PhysicsConfig {
  /** Velocity retained per 1/60s. */
  damping: number;
  repulsion: number;
  spring: number;
  pin: number;
  driftAmp: number;
  /** Pointer push. 0 disables cursor influence for ambient stages. */
  pointerK: number;
}

export const PHYSICS: PhysicsConfig = {
  damping: 0.85,
  repulsion: 22000,
  spring: 5.5,
  pin: 3.2,
  driftAmp: 0.35,
  pointerK: 2600,
};

export const PHYSICS_AMBIENT: PhysicsConfig = { ...PHYSICS, pointerK: 0 };

/** Springs pull hard on the money path and barely at all on observation. */
const SPRING_SCALE: Record<EdgeKind, number> = {
  demand: 1,
  flush: 1,
  repay: 1,
  credit: 0.12,
  liquidity: 0.8,
  watch: 0.05,
  anchor: 0,
};

const STEP_MS = 1000 / 60;
const MAX_SUBSTEPS = 4;
const MAX_SPEED = 90;
const REPULSION_RANGE = 130;
const POINTER_RANGE = 110;
const BOUND = { minX: -70, maxX: 1070, minY: -70, maxY: 690 };

interface Scratch {
  nodes: GraphNode[];
  index: Map<string, number>;
  ax: Float64Array;
  ay: Float64Array;
  bx: Float64Array;
  by: Float64Array;
  accumulator: number;
}

const scratches = new WeakMap<GraphWorld, Scratch>();

function scratchFor(world: GraphWorld): Scratch {
  let s = scratches.get(world);
  const size = Math.max(64, world.nodes.size + 16);
  if (!s) {
    s = {
      nodes: [],
      index: new Map(),
      ax: new Float64Array(size),
      ay: new Float64Array(size),
      bx: new Float64Array(size),
      by: new Float64Array(size),
      accumulator: 0,
    };
    scratches.set(world, s);
  } else if (s.ax.length < world.nodes.size) {
    s.ax = new Float64Array(size);
    s.ay = new Float64Array(size);
    s.bx = new Float64Array(size);
    s.by = new Float64Array(size);
  }
  s.nodes.length = 0;
  s.index.clear();
  for (const node of world.nodes.values()) {
    s.index.set(node.id, s.nodes.length);
    s.nodes.push(node);
  }
  return s;
}

function forces(
  world: GraphWorld,
  nodes: GraphNode[],
  index: Map<string, number>,
  cfg: PhysicsConfig,
  ax: Float64Array,
  ay: Float64Array,
): void {
  const count = nodes.length;
  const t = world.time;

  for (let i = 0; i < count; i += 1) {
    const n = nodes[i];
    if (n.fixed) {
      ax[i] = 0;
      ay[i] = 0;
      continue;
    }
    // Drift amplitude is scaled so a lightly pinned buyer wanders about 5 scene
    // units and the vault barely half of one. The hierarchy is the point: the
    // edge of the economy breathes, the institution at its center does not.
    const pinK = n.pinK * cfg.pin * 100;
    ax[i] = -pinK * (n.x - n.pinX) + drift(n.seed, t) * cfg.driftAmp * 44;
    ay[i] = -pinK * (n.y - n.pinY) + drift(n.seed + 37, t * 0.83) * cfg.driftAmp * 44;
  }

  // Weak short-range repulsion. 30 nodes means the naive pass is free.
  for (let i = 0; i < count; i += 1) {
    const a = nodes[i];
    if (a.fixed) continue;
    for (let j = i + 1; j < count; j += 1) {
      const b = nodes[j];
      if (b.fixed) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > REPULSION_RANGE * REPULSION_RANGE) continue;
      const d = Math.sqrt(d2) || 0.001;
      const f = cfg.repulsion / Math.max(d2, 64);
      const ux = dx / d;
      const uy = dy / d;
      ax[i] += ux * f;
      ay[i] += uy * f;
      ax[j] -= ux * f;
      ay[j] -= uy * f;
    }
  }

  // Springs. Rest lengths equal the pin distances, so these mostly couple
  // neighbours together rather than fighting the layout.
  for (const edge of world.edges.values()) {
    const scale = SPRING_SCALE[edge.kind];
    if (scale === 0) continue;
    const a = world.nodes.get(edge.from);
    const b = world.nodes.get(edge.to);
    if (!a || !b) continue;
    const ia = index.get(a.id);
    const ib = index.get(b.id);
    if (ia === undefined || ib === undefined) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const f = cfg.spring * scale * (d - edge.length);
    const ux = dx / d;
    const uy = dy / d;
    if (!a.fixed) {
      ax[ia] += ux * f;
      ay[ia] += uy * f;
    }
    if (!b.fixed) {
      ax[ib] -= ux * f;
      ay[ib] -= uy * f;
    }
  }

  if (cfg.pointerK > 0 && world.pointer.active) {
    const px = world.pointer.x;
    const py = world.pointer.y;
    for (let i = 0; i < count; i += 1) {
      const n = nodes[i];
      if (n.fixed) continue;
      const dx = n.x - px;
      const dy = n.y - py;
      const d = Math.hypot(dx, dy);
      if (d > POINTER_RANGE) continue;
      const near = Math.max(d, 14);
      const f = cfg.pointerK / (near * near);
      ax[i] += (dx / (d || 1)) * f;
      ay[i] += (dy / (d || 1)) * f;
    }
  }
}

function integrate(
  world: GraphWorld,
  nodes: GraphNode[],
  cfg: PhysicsConfig,
  s: Scratch,
  h: number,
): void {
  const count = nodes.length;
  forces(world, nodes, s.index, cfg, s.ax, s.ay);

  for (let i = 0; i < count; i += 1) {
    const n = nodes[i];
    if (n.fixed) continue;
    n.x += n.vx * h + 0.5 * s.ax[i] * h * h;
    n.y += n.vy * h + 0.5 * s.ay[i] * h * h;
  }

  forces(world, nodes, s.index, cfg, s.bx, s.by);

  const retain = Math.pow(cfg.damping, h * 60);
  for (let i = 0; i < count; i += 1) {
    const n = nodes[i];
    if (n.fixed) continue;
    n.vx = (n.vx + 0.5 * (s.ax[i] + s.bx[i]) * h) * retain;
    n.vy = (n.vy + 0.5 * (s.ay[i] + s.by[i]) * h) * retain;

    const speed = Math.hypot(n.vx, n.vy);
    if (speed > MAX_SPEED) {
      n.vx = (n.vx / speed) * MAX_SPEED;
      n.vy = (n.vy / speed) * MAX_SPEED;
    }
    n.x = clamp(n.x, BOUND.minX, BOUND.maxX);
    n.y = clamp(n.y, BOUND.minY, BOUND.maxY);
  }
}

/** Per-frame state decay. Separate from integration because it is dt-based. */
function decay(world: GraphWorld, dtMs: number): void {
  const pointer = world.pointer;
  for (const node of world.nodes.values()) {
    node.heat = damp(node.heat, 0, 220, dtMs);
    node.flash = damp(node.flash, 0, 70, dtMs);
    node.born = Math.min(1, node.born + dtMs / 450);
    node.radius = damp(node.radius, node.targetRadius, 260, dtMs);

    const wantsLabel = node.featured || world.hover === node.id;
    node.labelHold = damp(node.labelHold, wantsLabel ? 1 : 0, 110, dtMs);

    if (pointer.active && node.role !== "anchor") {
      const d = Math.hypot(node.x - pointer.x, node.y - pointer.y);
      if (d < 90) node.heat = Math.min(1.2, node.heat + (1 - d / 90) * dtMs * 0.0015);
    }
  }
  for (const edge of world.edges.values()) {
    edge.weight = damp(edge.weight, 0, 420, dtMs);
  }
  world.splitFlash = damp(world.splitFlash, 0, 90, dtMs);
}

/**
 * `settle` false freezes the layout while still decaying heat, flashes and label
 * ramps. That is the reduced-motion path: a static diagram whose values still
 * update, rather than a dead canvas.
 */
export function stepPhysics(
  world: GraphWorld,
  dtMs: number,
  config: PhysicsConfig = PHYSICS,
  settle = true,
): void {
  const dt = clamp(dtMs, 0, 48);
  world.time += dt / 1000;
  decay(world, dt);
  if (!settle) return;

  const s = scratchFor(world);
  s.accumulator += dt;
  let steps = 0;
  while (s.accumulator >= STEP_MS && steps < MAX_SUBSTEPS) {
    integrate(world, s.nodes, config, s, STEP_MS / 1000);
    s.accumulator -= STEP_MS;
    steps += 1;
  }
  // Never let a backlog build after a stall: drop it instead of catching up.
  if (s.accumulator > STEP_MS) s.accumulator = 0;
}

/**
 * Settle the layout without animating it. Used on mount and under reduced
 * motion, where the graph is a static diagram that still has to look composed.
 */
export function warmup(world: GraphWorld, seconds = 3, config: PhysicsConfig = PHYSICS): void {
  const steps = Math.round((seconds * 1000) / STEP_MS);
  const s = scratchFor(world);
  for (let i = 0; i < steps; i += 1) {
    world.time += STEP_MS / 1000;
    integrate(world, s.nodes, config, s, STEP_MS / 1000);
  }
  for (const node of world.nodes.values()) {
    node.born = 1;
    node.radius = node.targetRadius;
    node.vx = 0;
    node.vy = 0;
  }
}
