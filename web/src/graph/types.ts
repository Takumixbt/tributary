/*
 * Graph-internal types. Zone: src/graph/**. Reshape freely, but keep the
 * exports that index.ts re-exports, because other zones import those.
 */

import type { Address, AgentHealth, NodeRole } from "../lib/types";
import type { AnchorId } from "../lib/stage";

/**
 * NodeRole plus the one role the simulation adds: an "anchor" node is a DOM
 * connection point promoted into the physics world so an edge can terminate on
 * a real panel. Treating it as a node means every pulse, spring and renderer
 * path works on anchored edges without a special case.
 */
export type GraphRole = NodeRole | "anchor";

/**
 * What an edge means. The money reads left to right: demand pays the agent, the
 * flush carries the gross to the router, the repay leg carries the vault's cut.
 */
export type EdgeKind =
  | "demand"
  | "flush"
  | "repay"
  | "credit"
  | "liquidity"
  | "watch"
  | "anchor";

/** Which leg of the circuit a pulse represents. Splits fork into vault + agent. */
export type PulseLane = "payment" | "vault" | "agent" | "draw" | "deposit" | "score";

/** A node in the force simulation. Positions are scene-space (see lib/stage). */
export interface GraphNode {
  id: string;
  role: GraphRole;
  /** Present for agent, router, buyer and lender nodes. */
  address?: Address;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Soft pin target. Buyers left, seller center, router and vault right. */
  pinX: number;
  pinY: number;
  /** Pin stiffness. Higher means the topology reads more like a sentence. */
  pinK: number;
  /** Visual radius in scene units, driven by revenue velocity for agents. */
  radius: number;
  /** Radius the node is damping toward. Revenue velocity moves this, not radius. */
  targetRadius: number;
  /** 0-1000, agents only. Drives the dithered score aura. */
  score?: number;
  health?: AgentHealth;
  /** Per-node drift seed so nothing ever fully sleeps. */
  seed: number;
  /** 0-1 birth animation progress. */
  born: number;
  /** Rises on activity, decays every frame. Drives brightness. */
  heat: number;
  /** One-frame flash. The router spends it on every split. */
  flash: number;
  /** Jitter amplitude in scene units. Non-zero only for throttled agents. */
  jitter: number;
  /** The agent under the lens. Drawn on the front layer, in white, labelled. */
  featured: boolean;
  /** Structural placeholder, drawn faint, before the stream delivers a world. */
  scaffold: boolean;
  /** Anchor nodes take their position from the DOM, never from physics. */
  fixed: boolean;
  /** Label visibility, 0-1. Ramps on hover and on feature. */
  labelHold: number;
  /** Edge ids this node routes through. The split fork resolves its legs here. */
  refs: {
    flush?: string;
    repay?: string;
    credit?: string;
    anchor?: string;
    watch?: string;
  };
  /** Companion node id: a router's agent, an agent's router. */
  peer?: string;
  /** Set on anchor nodes only. */
  anchorId?: AnchorId;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  /** Ideal rest length in scene units. */
  length: number;
  /** Credit-state grammar: solid healthy, dashed throttled. */
  dashed: boolean;
  /** Traffic weight, decays. Drives edge alpha. */
  weight: number;
  /** True when this edge terminates on a DOM anchor instead of a node. */
  anchored?: boolean;
  /** Baseline alpha multiplier. Watch and credit legs sit quieter than money. */
  rest: number;
}

/** One payment in flight along an edge. */
export interface Pulse {
  id: number;
  edgeId: string;
  /** 0-1 along the edge, from -> to. */
  t: number;
  /** Scene units per second. */
  speed: number;
  radius: number;
  /** What this pulse represents. Splits fork into two "vault" + "agent" pulses. */
  lane: PulseLane;
  /** Fires the fork at the router when the pulse arrives. */
  forks?: { toVault: number; toAgent: number };
  bornAt: number;
  /** 1 travels from -> to, -1 travels back. The agent's 80% returns upstream. */
  dir: 1 | -1;
  /** Under reduced motion a pulse never travels: it blips at both ends. */
  blip: number;
  /** True once the arrival effects have fired. Blips linger a beat longer. */
  arrived: boolean;
}

/** A ring wave: debt cleared, line opened, agent registered. */
export interface RingWave {
  x: number;
  y: number;
  /** 0-1 progress. */
  t: number;
  maxRadius: number;
  width: number;
}

export interface GraphWorld {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  pulses: Pulse[];
  waves: RingWave[];
  /** Newest pulse position in screen pixels, for the cursor-proximity grid. */
  lastPulseScreen: { x: number; y: number } | null;

  /** Monotonic pulse ids. */
  nextPulseId: number;
  /** Seconds of simulation time. Drives drift, blink and dash offsets. */
  time: number;
  /** Node id of the featured agent, or null. */
  featured: string | null;
  /** Node id under the pointer, or null. */
  hover: string | null;
  /** Pointer in scene space. Hero mode lets it push nodes around. */
  pointer: { x: number; y: number; active: boolean };
  /** Rises to 1 on every split, decays fast. The page's shared heartbeat. */
  splitFlash: number;
  /** True until the stream delivers its first agent. Drives the faint scaffold. */
  placeholder: boolean;
  /** Agents whose birth ring is waiting for their node to exist. */
  pendingWaves: string[];
}
