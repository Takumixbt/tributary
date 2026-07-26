/*
 * Pulses and the split moment. Zone: src/graph/**.
 *
 * A payment is a bright short segment travelling its edge. Radius maps to
 * log(amount) so a sub-cent nanopayment still registers. When a pulse reaches a
 * router node it forks into two pulses whose radii are proportional to the split,
 * with a one-frame flash on the router: 20% continues to the vault, 80% goes back
 * to the agent. That fork is the single most legible moment in the product. The
 * hero is choreographed around it.
 *
 * At motionScale 0, travel is replaced by an instant blip at both ends of the
 * edge. The event still lands, the flash still fires, the fork still divides.
 * Reduced motion removes travel, not truth.
 */

import { pulseRadius } from "../../lib/paint";
import { isKind, type Micro, type TributaryEvent } from "../../lib/types";
import { NODE_ID } from "./topology";
import type { GraphEdge, GraphNode, GraphWorld, Pulse, PulseLane } from "../types";

/** Scene units per second. The flush is deliberately slower: it is the setup. */
const SPEED: Record<PulseLane, number> = {
  payment: 330,
  vault: 285,
  agent: 300,
  draw: 155,
  deposit: 210,
  score: 430,
};

const ANCHOR_SPEED = 420;
const WAVE_MS = 900;
const BLIP_MS = 320;

function micro(value: Micro): number {
  return Number(value);
}

function edgeEnds(world: GraphWorld, edge: GraphEdge): [GraphNode, GraphNode] | null {
  const a = world.nodes.get(edge.from);
  const b = world.nodes.get(edge.to);
  if (!a || !b) return null;
  return [a, b];
}

function currentLength(world: GraphWorld, edge: GraphEdge): number {
  const ends = edgeEnds(world, edge);
  if (!ends) return edge.length || 1;
  return Math.max(1, Math.hypot(ends[1].x - ends[0].x, ends[1].y - ends[0].y));
}

interface SpawnSpec {
  edge: GraphEdge;
  lane: PulseLane;
  radius: number;
  dir?: 1 | -1;
  speed?: number;
  forks?: { toVault: number; toAgent: number };
  /** Reduced motion: blip instead of travel. */
  reduced?: boolean;
}

function push(world: GraphWorld, spec: SpawnSpec): Pulse {
  const dir = spec.dir ?? 1;
  const pulse: Pulse = {
    id: world.nextPulseId,
    edgeId: spec.edge.id,
    t: dir > 0 ? 0 : 1,
    speed: spec.speed ?? SPEED[spec.lane],
    radius: spec.radius,
    lane: spec.lane,
    bornAt: world.time,
    dir,
    blip: spec.reduced ? 1 : 0,
    arrived: false,
    ...(spec.forks ? { forks: spec.forks } : {}),
  };
  world.nextPulseId += 1;
  world.pulses.push(pulse);
  spec.edge.weight = Math.min(1.8, spec.edge.weight + 0.55);
  // A hard cap: a burst may not turn into thousands of live pulses.
  if (world.pulses.length > 420) world.pulses.splice(0, world.pulses.length - 420);
  return pulse;
}

function findDemandEdge(world: GraphWorld, buyer: string, agent: string): GraphEdge | null {
  const direct = world.edges.get(`e:d:${buyer}>${agent}`);
  if (direct) return direct;
  // Density is stepped down behind content, so a buyer may not have a node.
  const agentId = NODE_ID.agent(agent);
  for (const edge of world.edges.values()) {
    if (edge.kind === "demand" && edge.to === agentId) return edge;
  }
  return null;
}

function wave(world: GraphWorld, node: GraphNode, maxRadius = 44): void {
  world.waves.push({ x: node.x, y: node.y, t: 0, maxRadius, width: 1 });
  if (world.waves.length > 24) world.waves.shift();
}

/**
 * Turn one event into motion. Called in seq order, once per event, from inside
 * the frame so ordering can never invert.
 */
export function spawnFromEvent(world: GraphWorld, event: TributaryEvent, reduced = false): void {
  if (isKind(event, "payment")) {
    const edge = findDemandEdge(world, event.buyer, event.agent);
    const agent = world.nodes.get(NODE_ID.agent(event.agent));
    if (agent) agent.heat = Math.min(1.4, agent.heat + 0.34);
    const buyer = world.nodes.get(NODE_ID.buyer(event.buyer));
    if (buyer) buyer.heat = Math.min(1.2, buyer.heat + 0.5);
    if (edge) {
      push(world, { edge, lane: "payment", radius: pulseRadius(micro(event.amount)), reduced });
    }
    return;
  }

  if (isKind(event, "split")) {
    const edge = world.edges.get(`e:f:${event.agent}`);
    if (!edge) return;
    push(world, {
      edge,
      lane: "payment",
      radius: pulseRadius(micro(event.total)),
      speed: 240,
      forks: { toVault: micro(event.toVault), toAgent: micro(event.toAgent) },
      reduced,
    });
    return;
  }

  if (isKind(event, "draw")) {
    const agent = world.nodes.get(NODE_ID.agent(event.agent));
    const creditId = agent?.refs.credit;
    const edge = creditId ? world.edges.get(creditId) : null;
    const vault = world.nodes.get(NODE_ID.vault);
    if (vault) vault.heat = Math.min(1.4, vault.heat + 0.5);
    if (edge) {
      push(world, { edge, lane: "draw", radius: pulseRadius(micro(event.amount)) * 1.5, reduced });
    } else if (agent) {
      wave(world, agent, 52);
    }
    return;
  }

  if (isKind(event, "deposit")) {
    const edge = world.edges.get(`e:l:${event.lender}`);
    const vault = world.nodes.get(NODE_ID.vault);
    if (vault) vault.heat = Math.min(1.4, vault.heat + 0.4);
    if (edge) {
      push(world, {
        edge,
        lane: "deposit",
        radius: pulseRadius(micro(event.assets)) * 1.2,
        dir: event.direction === "out" ? -1 : 1,
        reduced,
      });
    }
    return;
  }

  if (isKind(event, "repay")) {
    // The split already animates this money arriving. The vault only brightens,
    // so a repayment is one event with one visual, not two competing ones.
    const vault = world.nodes.get(NODE_ID.vault);
    if (vault) {
      vault.heat = Math.min(1.5, vault.heat + 0.45);
      const anchorId = vault.refs.anchor;
      const edge = anchorId ? world.edges.get(anchorId) : null;
      if (edge) edge.weight = Math.min(1.8, edge.weight + 0.5);
    }
    return;
  }

  if (isKind(event, "score")) {
    const agent = world.nodes.get(NODE_ID.agent(event.agent));
    if (!agent) return;
    agent.score = event.score;
    const watchId = agent.refs.watch;
    const edge = watchId ? world.edges.get(watchId) : null;
    if (edge) push(world, { edge, lane: "score", radius: 1.3, reduced });
    if (event.action === "opened" || event.action === "raised") wave(world, agent, 40);
    return;
  }

  if (isKind(event, "cleared")) {
    const router = world.nodes.get(NODE_ID.router(event.router));
    const agent = world.nodes.get(NODE_ID.agent(event.agent));
    // Debt cleared: one expanding ring from the router. Rare, so it can be loud.
    if (router) {
      wave(world, router, 120);
      router.flash = 1;
    }
    if (agent) {
      agent.heat = Math.min(1.6, agent.heat + 0.8);
      wave(world, agent, 64);
    }
    return;
  }

  if (isKind(event, "register")) {
    // The node does not exist until the next snapshot. Hold the ring until then.
    world.pendingWaves.push(event.agent);
    if (world.pendingWaves.length > 8) world.pendingWaves.shift();
  }
}

function arrive(world: GraphWorld, pulse: Pulse, edge: GraphEdge, node: GraphNode): void {
  node.heat = Math.min(1.6, node.heat + 0.3 + pulse.radius * 0.08);

  if (node.role === "router" && pulse.forks) {
    // THE SPLIT. One pulse in, two out, radii proportional to the division, and
    // a one-frame flash on the router itself. Everything else on this page is
    // annotation on this moment.
    //
    // The fork radii come from the arriving pulse and the split fraction, not
    // from pulseRadius: that curve is logarithmic by design, so a 20/80 division
    // of the same payment would come out 4.0 against 4.5 and the whole point of
    // the animation would be invisible. Splitting the parent's radius keeps the
    // ratio readable and makes the two forks feel like one pulse divided.
    node.flash = 1;
    world.splitFlash = 1;
    const flushId = node.refs.flush;
    const repayId = node.refs.repay;
    const toVault = repayId ? world.edges.get(repayId) : null;
    const toAgent = flushId ? world.edges.get(flushId) : null;
    const reduced = pulse.blip > 0;
    const total = pulse.forks.toVault + pulse.forks.toAgent || 1;
    const share = (part: number) =>
      Math.min(7, Math.max(1.15, pulse.radius * (0.4 + (part / total) * 1.15)));

    if (toVault) {
      push(world, {
        edge: toVault,
        lane: "vault",
        radius: share(pulse.forks.toVault),
        reduced,
      });
    }
    if (toAgent) {
      // The agent's share travels back up the flush edge. Two pulses leaving in
      // opposite directions is what makes "divided" legible without a label.
      push(world, {
        edge: toAgent,
        lane: "agent",
        radius: share(pulse.forks.toAgent),
        dir: -1,
        reduced,
      });
    }
    const anchorId = node.refs.anchor;
    const anchorEdge = anchorId ? world.edges.get(anchorId) : null;
    if (anchorEdge) {
      push(world, {
        edge: anchorEdge,
        lane: "vault",
        radius: Math.max(1.2, share(pulse.forks.toVault) * 0.85),
        speed: ANCHOR_SPEED,
        reduced,
      });
    }
    return;
  }

  if (node.role === "anchor") {
    // The money has arrived inside a panel. Flash the terminal, go no further.
    node.flash = 1;
    return;
  }

  // Continue into the DOM if this node has a panel bound to it.
  if (edge.kind !== "anchor") {
    const anchorId = node.refs.anchor;
    const anchorEdge = anchorId ? world.edges.get(anchorId) : null;
    const carries = pulse.lane === "vault" || pulse.lane === "agent" || pulse.lane === "draw";
    if (anchorEdge && carries) {
      push(world, {
        edge: anchorEdge,
        lane: pulse.lane,
        radius: Math.max(1.1, pulse.radius * 0.85),
        speed: ANCHOR_SPEED,
        reduced: pulse.blip > 0,
      });
    }
  }
}

export function stepPulses(world: GraphWorld, dtMs: number, motionScale: number): void {
  const dt = dtMs / 1000;
  const reduced = motionScale === 0;
  const count = world.pulses.length;

  for (let i = count - 1; i >= 0; i -= 1) {
    const pulse = world.pulses[i];
    const edge = world.edges.get(pulse.edgeId);
    if (!edge) {
      world.pulses.splice(i, 1);
      continue;
    }

    if (reduced || pulse.blip > 0) {
      if (!pulse.arrived) {
        pulse.arrived = true;
        const ends = edgeEnds(world, edge);
        if (ends) arrive(world, pulse, edge, pulse.dir > 0 ? ends[1] : ends[0]);
      }
      pulse.blip = Math.max(0, pulse.blip - dtMs / BLIP_MS);
      if (pulse.blip <= 0) world.pulses.splice(i, 1);
      continue;
    }

    const length = currentLength(world, edge);
    pulse.t += ((pulse.speed * dt) / length) * pulse.dir;
    edge.weight = Math.min(1.8, edge.weight + dt * 0.35);

    const done = pulse.dir > 0 ? pulse.t >= 1 : pulse.t <= 0;
    if (!done) continue;

    pulse.t = pulse.dir > 0 ? 1 : 0;
    const ends = edgeEnds(world, edge);
    if (ends) arrive(world, pulse, edge, pulse.dir > 0 ? ends[1] : ends[0]);
    world.pulses.splice(i, 1);
  }

  for (let i = world.waves.length - 1; i >= 0; i -= 1) {
    const w = world.waves[i];
    w.t += reduced ? dtMs / (WAVE_MS * 0.5) : dtMs / WAVE_MS;
    if (w.t >= 1) world.waves.splice(i, 1);
  }
}

/**
 * Wiring self test. Runs only while the stream has delivered nothing at all:
 * no producer connected, or a producer that has not started. It walks one
 * payment through the circuit so the stage proves it is wired, and it is drawn
 * at scaffold weight so it can never be mistaken for traffic. Any real event
 * stops it for good.
 */
export function spawnSelfTest(world: GraphWorld, step: number, index: number): void {
  const agentId = `a:scaffold-${index % 3}`;
  const agent = world.nodes.get(agentId);
  if (!agent) return;

  if (step === 0) {
    for (const edge of world.edges.values()) {
      if (edge.kind === "demand" && edge.to === agentId) {
        push(world, { edge, lane: "payment", radius: 1.4 });
        return;
      }
    }
    return;
  }

  const flush = agent.refs.flush ? world.edges.get(agent.refs.flush) : null;
  if (!flush) return;
  push(world, {
    edge: flush,
    lane: "payment",
    radius: 2.6,
    speed: 240,
    forks: { toVault: 400_000, toAgent: 1_600_000 },
  });
}
