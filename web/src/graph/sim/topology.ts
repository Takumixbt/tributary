/*
 * Snapshot to graph. Zone: src/graph/**.
 *
 * Derives nodes and edges from a StreamSnapshot: one node per buyer, per agent,
 * per router, one vault node, one lender cluster, one underwriter. Nodes are
 * reconciled, never rebuilt, so positions and heat survive every update.
 *
 * Soft pin targets, in the 1000 x 620 scene box:
 *   buyers x 90-200, spread on y     seller agents x 460-540
 *   routers x 700                    vault x 880, y 310
 *   lenders x 960 (edge of frame)    underwriter x 880, y 90
 *
 * Left to right is the sentence: earn, split, repay. Nothing in here is allowed
 * to scramble that, which is why every node keeps a soft pin and the springs are
 * only strong enough to make the topology breathe.
 */

import { clamp, smoothstep } from "../../lib/motion";
import type { AnchorBind, AnchorId } from "../../lib/stage";
import type { AgentState, StreamSnapshot } from "../../lib/types";
import type { AnchorRect } from "../anchors";
import { projection, type Camera } from "../camera";
import type { EdgeKind, GraphEdge, GraphNode, GraphRole, GraphWorld } from "../types";

export const NODE_ID = {
  vault: "vault",
  underwriter: "underwriter",
  agent: (address: string) => `a:${address}`,
  router: (address: string) => `r:${address}`,
  buyer: (address: string) => `b:${address}`,
  lender: (address: string) => `l:${address}`,
  anchor: (id: AnchorId) => `x:${id}`,
} as const;

const EDGE_ID = {
  demand: (buyer: string, agent: string) => `e:d:${buyer}>${agent}`,
  flush: (agent: string) => `e:f:${agent}`,
  repay: (agent: string) => `e:p:${agent}`,
  credit: (agent: string) => `e:c:${agent}`,
  liquidity: (lender: string) => `e:l:${lender}`,
  watch: (agent: string) => `e:w:${agent}`,
  anchor: (id: AnchorId) => `e:x:${id}`,
} as const;

/** Deterministic 0-1 from a string. Layout must be identical every load. */
function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function createWorld(): GraphWorld {
  return {
    nodes: new Map(),
    edges: new Map(),
    pulses: [],
    waves: [],
    lastPulseScreen: null,
    nextPulseId: 1,
    time: 0,
    featured: null,
    hover: null,
    pointer: { x: 0, y: 0, active: false },
    splitFlash: 0,
    placeholder: true,
    pendingWaves: [],
  };
}

interface NodeSeed {
  id: string;
  role: GraphRole;
  label: string;
  pinX: number;
  pinY: number;
  pinK: number;
  radius: number;
  address?: string;
}

function upsertNode(world: GraphWorld, seed: NodeSeed): GraphNode {
  const existing = world.nodes.get(seed.id);
  if (existing) {
    existing.label = seed.label;
    existing.pinX = seed.pinX;
    existing.pinY = seed.pinY;
    existing.pinK = seed.pinK;
    existing.targetRadius = seed.radius;
    existing.scaffold = false;
    return existing;
  }
  const h = hash01(seed.id);
  const node: GraphNode = {
    id: seed.id,
    role: seed.role,
    address: seed.address as GraphNode["address"],
    label: seed.label,
    // Born a little off its pin so the settle reads as the system waking up.
    x: seed.pinX + (h - 0.5) * 44,
    y: seed.pinY + (hash01(`${seed.id}y`) - 0.5) * 44,
    vx: 0,
    vy: 0,
    pinX: seed.pinX,
    pinY: seed.pinY,
    pinK: seed.pinK,
    radius: seed.radius * 0.4,
    targetRadius: seed.radius,
    seed: h * 100,
    born: 0,
    heat: 0,
    flash: 0,
    jitter: 0,
    featured: false,
    scaffold: false,
    fixed: false,
    labelHold: 0,
    refs: {},
  };
  world.nodes.set(node.id, node);
  return node;
}

function upsertEdge(
  world: GraphWorld,
  id: string,
  from: string,
  to: string,
  kind: EdgeKind,
  rest: number,
  dashed = false,
): GraphEdge | null {
  const a = world.nodes.get(from);
  const b = world.nodes.get(to);
  if (!a || !b) return null;
  const length = Math.hypot(b.pinX - a.pinX, b.pinY - a.pinY) || 60;
  const existing = world.edges.get(id);
  if (existing) {
    existing.length = length;
    existing.dashed = dashed;
    existing.rest = rest;
    return existing;
  }
  const edge: GraphEdge = {
    id,
    from,
    to,
    kind,
    length,
    dashed,
    weight: 0,
    rest,
    anchored: kind === "anchor",
  };
  world.edges.set(id, edge);
  return edge;
}

/** Revenue velocity, not revenue total, sets an agent's silhouette. */
function agentRadius(agent: AgentState): number {
  return 6 + 6 * smoothstep(clamp(agent.paymentsPerMin / 140, 0, 1));
}

function buyerPin(index: number, total: number): { x: number; y: number } {
  const columns = 2;
  const column = index % columns;
  const rows = Math.max(1, Math.ceil(total / columns));
  const row = Math.floor(index / columns);
  const span = 470 / rows;
  return {
    x: 92 + column * 104,
    y: 78 + (row + (column === 1 ? 0.5 : 0)) * span,
  };
}

function agentPin(index: number, total: number): { x: number; y: number } {
  const span = total > 1 ? 400 / (total - 1) : 0;
  return {
    x: index % 2 === 0 ? 470 : 526,
    y: 110 + index * span,
  };
}

/** Routers funnel toward the vault's row, so the fork lines read as a river. */
function routerPin(agentY: number): { x: number; y: number } {
  return { x: 700, y: 310 + (agentY - 310) * 0.72 };
}

function lenderPin(index: number, total: number): { x: number; y: number } {
  const span = total > 1 ? 150 / (total - 1) : 0;
  return { x: 962, y: 236 + index * span };
}

export interface SyncOptions {
  /** Fraction of buyer nodes to keep. Density steps down behind content. */
  buyerKeep?: number;
}

/**
 * Reconcile the world against a snapshot. Called only when the snapshot object
 * changes, never every frame.
 */
export function syncTopology(
  world: GraphWorld,
  snapshot: StreamSnapshot,
  options: SyncOptions = {},
): void {
  if (snapshot.agents.length === 0) {
    buildScaffold(world);
    return;
  }

  world.placeholder = false;
  const keepNodes = new Set<string>();
  const keepEdges = new Set<string>();

  // ------------------------------------------------------------------ vault
  const vault = upsertNode(world, {
    id: NODE_ID.vault,
    role: "vault",
    label: "TRIBUTARY VAULT",
    pinX: 880,
    pinY: 310,
    pinK: 0.075,
    radius: 20,
    address: snapshot.vault.address,
  });
  keepNodes.add(vault.id);

  const underwriter = upsertNode(world, {
    id: NODE_ID.underwriter,
    role: "underwriter",
    label: "UNDERWRITER",
    pinX: 880,
    pinY: 90,
    pinK: 0.07,
    radius: 6,
  });
  keepNodes.add(underwriter.id);

  // ----------------------------------------------------------------- agents
  const featured = snapshot.featuredAgent ?? snapshot.agents[0]?.address ?? null;
  world.featured = featured ? NODE_ID.agent(featured) : null;

  snapshot.agents.forEach((agent, index) => {
    const pin = agentPin(index, snapshot.agents.length);
    const agentNode = upsertNode(world, {
      id: NODE_ID.agent(agent.address),
      role: "agent",
      label: agent.label,
      pinX: pin.x,
      pinY: pin.y,
      pinK: 0.014,
      radius: agentRadius(agent),
      address: agent.address,
    });
    agentNode.score = agent.score;
    agentNode.health = agent.health;
    agentNode.featured = agentNode.id === world.featured;
    agentNode.jitter = agent.health === "throttled" ? 1.5 : 0;
    keepNodes.add(agentNode.id);

    const rPin = routerPin(pin.y);
    const routerNode = upsertNode(world, {
      id: NODE_ID.router(agent.router),
      role: "router",
      label: `${agent.label} ROUTER`,
      pinX: rPin.x,
      pinY: rPin.y,
      pinK: 0.03,
      radius: 4.5,
      address: agent.router,
    });
    routerNode.health = agent.health;
    routerNode.peer = agentNode.id;
    keepNodes.add(routerNode.id);
    agentNode.peer = routerNode.id;

    const throttled = agent.health !== "healthy";
    const flush = upsertEdge(
      world,
      EDGE_ID.flush(agent.address),
      agentNode.id,
      routerNode.id,
      "flush",
      1,
      false,
    );
    const repay = upsertEdge(
      world,
      EDGE_ID.repay(agent.address),
      routerNode.id,
      vault.id,
      "repay",
      1,
      throttled,
    );
    if (flush) keepEdges.add(flush.id);
    if (repay) keepEdges.add(repay.id);
    routerNode.refs.flush = flush?.id;
    routerNode.refs.repay = repay?.id;
    agentNode.refs.flush = flush?.id;

    // The credit line itself: the vault reaching back to the agent. Dashed when
    // the underwriter has throttled the line, which is the whole state grammar.
    if (agent.lineStatus === "active" || agent.lineStatus === "throttled") {
      const credit = upsertEdge(
        world,
        EDGE_ID.credit(agent.address),
        vault.id,
        agentNode.id,
        "credit",
        0.55,
        agent.lineStatus === "throttled",
      );
      if (credit) {
        keepEdges.add(credit.id);
        agentNode.refs.credit = credit.id;
      }
    }

    const watch = upsertEdge(
      world,
      EDGE_ID.watch(agent.address),
      underwriter.id,
      agentNode.id,
      "watch",
      0.3,
      true,
    );
    if (watch) {
      keepEdges.add(watch.id);
      agentNode.refs.watch = watch.id;
    }

    if (world.pendingWaves.includes(agent.address)) {
      world.pendingWaves = world.pendingWaves.filter((a) => a !== agent.address);
      world.waves.push({ x: agentNode.x, y: agentNode.y, t: 0, maxRadius: 46, width: 1 });
    }
  });

  // ----------------------------------------------------------------- buyers
  const keep = clamp(options.buyerKeep ?? 1, 0.2, 1);
  const buyerCount = Math.max(4, Math.round(snapshot.buyers.length * keep));
  const buyers = snapshot.buyers.slice(0, buyerCount);
  buyers.forEach((buyer, index) => {
    const pin = buyerPin(index, buyers.length);
    const node = upsertNode(world, {
      id: NODE_ID.buyer(buyer.address),
      role: "buyer",
      label: buyer.label,
      pinX: pin.x,
      pinY: pin.y,
      pinK: 0.012,
      radius: 3.5,
      address: buyer.address,
    });
    keepNodes.add(node.id);

    for (const target of buyer.buysFrom) {
      const agentId = NODE_ID.agent(target);
      if (!keepNodes.has(agentId)) continue;
      const edge = upsertEdge(
        world,
        EDGE_ID.demand(buyer.address, target),
        node.id,
        agentId,
        "demand",
        0.85,
        false,
      );
      if (edge) keepEdges.add(edge.id);
    }
  });

  // ---------------------------------------------------------------- lenders
  snapshot.lenders.forEach((lender, index) => {
    const pin = lenderPin(index, snapshot.lenders.length);
    const node = upsertNode(world, {
      id: NODE_ID.lender(lender.address),
      role: "lender",
      label: lender.label,
      pinX: pin.x,
      pinY: pin.y,
      pinK: 0.06,
      radius: 2.4,
      address: lender.address,
    });
    keepNodes.add(node.id);
    const edge = upsertEdge(
      world,
      EDGE_ID.liquidity(lender.address),
      node.id,
      vault.id,
      "liquidity",
      0.5,
      false,
    );
    if (edge) keepEdges.add(edge.id);
  });

  prune(world, keepNodes, keepEdges);
}

/**
 * The world before the first payment. An empty economy still has a vault, an
 * underwriter and lenders, so the stage shows the wiring at low weight rather
 * than a black rectangle. No traffic is invented: nothing pulses until the
 * stream says something happened.
 */
export function buildScaffold(world: GraphWorld): void {
  if (!world.placeholder && world.nodes.size > 0) return;
  world.placeholder = true;

  const keepNodes = new Set<string>();
  const keepEdges = new Set<string>();

  const vault = upsertNode(world, {
    id: NODE_ID.vault,
    role: "vault",
    label: "TRIBUTARY VAULT",
    pinX: 880,
    pinY: 310,
    pinK: 0.075,
    radius: 20,
  });
  vault.scaffold = true;
  keepNodes.add(vault.id);

  const underwriter = upsertNode(world, {
    id: NODE_ID.underwriter,
    role: "underwriter",
    label: "UNDERWRITER",
    pinX: 880,
    pinY: 90,
    pinK: 0.07,
    radius: 6,
  });
  underwriter.scaffold = true;
  keepNodes.add(underwriter.id);

  const agentCount = 3;
  for (let i = 0; i < agentCount; i += 1) {
    const pin = agentPin(i, agentCount);
    const agentId = `a:scaffold-${i}`;
    const agent = upsertNode(world, {
      id: agentId,
      role: "agent",
      label: "AGENT",
      pinX: pin.x,
      pinY: pin.y,
      pinK: 0.014,
      radius: 7,
    });
    agent.scaffold = true;
    keepNodes.add(agentId);

    const rPin = routerPin(pin.y);
    const routerId = `r:scaffold-${i}`;
    const router = upsertNode(world, {
      id: routerId,
      role: "router",
      label: "ROUTER",
      pinX: rPin.x,
      pinY: rPin.y,
      pinK: 0.03,
      radius: 4.5,
    });
    router.scaffold = true;
    router.peer = agentId;
    agent.peer = routerId;
    keepNodes.add(routerId);

    const flush = upsertEdge(world, `e:f:scaffold-${i}`, agentId, routerId, "flush", 1);
    const repay = upsertEdge(world, `e:p:scaffold-${i}`, routerId, vault.id, "repay", 1);
    if (flush) keepEdges.add(flush.id);
    if (repay) keepEdges.add(repay.id);
    router.refs.flush = flush?.id;
    router.refs.repay = repay?.id;
    agent.refs.flush = flush?.id;

    const watch = upsertEdge(world, `e:w:scaffold-${i}`, underwriter.id, agentId, "watch", 0.3, true);
    if (watch) keepEdges.add(watch.id);

    for (let b = 0; b < 3; b += 1) {
      const index = i * 3 + b;
      const bPin = buyerPin(index, agentCount * 3);
      const buyerId = `b:scaffold-${index}`;
      const buyer = upsertNode(world, {
        id: buyerId,
        role: "buyer",
        label: "BUYER",
        pinX: bPin.x,
        pinY: bPin.y,
        pinK: 0.012,
        radius: 3.5,
      });
      buyer.scaffold = true;
      keepNodes.add(buyerId);
      const demand = upsertEdge(world, `e:d:scaffold-${index}`, buyerId, agentId, "demand", 0.85);
      if (demand) keepEdges.add(demand.id);
    }
  }

  for (let i = 0; i < 4; i += 1) {
    const pin = lenderPin(i, 4);
    const id = `l:scaffold-${i}`;
    const lender = upsertNode(world, {
      id,
      role: "lender",
      label: "LENDER",
      pinX: pin.x,
      pinY: pin.y,
      pinK: 0.06,
      radius: 2.4,
    });
    lender.scaffold = true;
    keepNodes.add(id);
    const edge = upsertEdge(world, `e:l:scaffold-${i}`, id, vault.id, "liquidity", 0.5);
    if (edge) keepEdges.add(edge.id);
  }

  prune(world, keepNodes, keepEdges);
}

/** Anchor nodes and connectors are never pruned by the snapshot reconciler. */
function prune(world: GraphWorld, keepNodes: Set<string>, keepEdges: Set<string>): void {
  for (const [id, node] of world.nodes) {
    if (node.role === "anchor") continue;
    if (!keepNodes.has(id)) world.nodes.delete(id);
  }
  for (const [id, edge] of world.edges) {
    if (edge.kind === "anchor") continue;
    if (!keepEdges.has(id)) world.edges.delete(id);
  }
}

function bindTarget(world: GraphWorld, bind: AnchorBind): GraphNode | null {
  if (bind === "vault") return world.nodes.get(NODE_ID.vault) ?? null;
  if (bind === "underwriter") return world.nodes.get(NODE_ID.underwriter) ?? null;

  if (bind === "featured" || bind === "agent") {
    const featured = world.featured ? world.nodes.get(world.featured) : null;
    if (featured) return featured;
    return first(world, "agent");
  }
  if (bind === "router") {
    const featured = world.featured ? world.nodes.get(world.featured) : null;
    const peer = featured?.peer ? world.nodes.get(featured.peer) : null;
    return peer ?? first(world, "router");
  }
  if (bind === "buyers") return first(world, "buyer");
  if (bind === "lenders") return first(world, "lender");
  return null;
}

function first(world: GraphWorld, role: GraphRole): GraphNode | null {
  for (const node of world.nodes.values()) if (node.role === role) return node;
  return null;
}

/**
 * Promote the measured DOM anchors into the world. This is the bleed: the vault
 * node's repay leg physically terminates on the vault panel's left border, so a
 * repayment pulse flies out of the simulation and lands inside the UI.
 *
 * Anchors outside the viewport are dropped rather than trailed to, so no
 * connector is ever drawn to a section three screens down.
 */
export function syncAnchors(
  world: GraphWorld,
  rects: Map<AnchorId, AnchorRect>,
  camera: Camera,
  viewport: { width: number; height: number },
  hostOffset: { x: number; y: number } = { x: 0, y: 0 },
): void {
  const seen = new Set<string>();
  const p = projection(camera, viewport);
  const margin = 120;

  // Bindings are recomputed from scratch every pass. "featured" and "router"
  // resolve at runtime, so a node that lost its panel must not keep a ref to it:
  // an arriving pulse would follow an edge that no longer starts where it thinks.
  for (const node of world.nodes.values()) {
    if (node.refs.anchor) node.refs.anchor = undefined;
  }

  for (const rect of rects.values()) {
    const sx = rect.x - hostOffset.x;
    const sy = rect.y - hostOffset.y;
    if (sx < -margin || sx > viewport.width + margin) continue;
    if (sy < -margin || sy > viewport.height + margin) continue;

    const target = bindTarget(world, rect.bind);
    if (!target) continue;

    const id = NODE_ID.anchor(rect.id);
    let node = world.nodes.get(id);
    if (!node) {
      node = {
        id,
        role: "anchor",
        label: rect.id.toUpperCase(),
        x: target.x,
        y: target.y,
        vx: 0,
        vy: 0,
        pinX: 0,
        pinY: 0,
        pinK: 0,
        radius: 2,
        targetRadius: 2,
        seed: hash01(id) * 100,
        born: 0,
        heat: 0,
        flash: 0,
        jitter: 0,
        featured: false,
        scaffold: false,
        fixed: true,
        labelHold: 0,
        refs: {},
        anchorId: rect.id,
      };
      world.nodes.set(id, node);
    }

    // Screen pixels back to scene units: the only conversion in this direction.
    node.x = (sx - p.ox) / p.scale;
    node.y = (sy - p.oy) / p.scale;
    node.pinX = node.x;
    node.pinY = node.y;
    seen.add(id);

    const edgeId = EDGE_ID.anchor(rect.id);
    let edge = world.edges.get(edgeId);
    if (!edge) {
      edge = {
        id: edgeId,
        from: target.id,
        to: id,
        kind: "anchor",
        length: 0,
        dashed: true,
        weight: 0,
        rest: 0.5,
        anchored: true,
      };
      world.edges.set(edgeId, edge);
    }
    edge.from = target.id;
    target.refs.anchor = edgeId;
  }

  for (const [id, node] of world.nodes) {
    if (node.role !== "anchor" || seen.has(id)) continue;
    world.nodes.delete(id);
    if (node.anchorId) world.edges.delete(EDGE_ID.anchor(node.anchorId));
  }
}
