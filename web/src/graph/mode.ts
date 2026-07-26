/*
 * Stage modes. Zone: src/graph/**.
 *
 * One simulation, three ways of showing it. The mode never changes the physics
 * or the event handling, only how loud the layers are and whether the pointer is
 * allowed to push nodes around. That is deliberate: the graph behind a dense
 * terminal has to stay the same living system, just quieter, or the page stops
 * reading as one machine.
 *
 *   hero     full bleed, interactive, everything at full weight
 *   ambient  behind long-form content, dimmer, no pointer influence
 *   compact  behind the terminal, quieter still, pulses stay bright because a
 *            pulse arriving at a panel is the whole point of the layout
 */

export type GraphMode = "hero" | "ambient" | "compact";

export interface ModePreset {
  /** Multiplier on edge alpha. */
  edge: number;
  /** Multiplier on node alpha. */
  node: number;
  /** Multiplier on pulse alpha. Pulses are the signal, so they stay loud. */
  pulse: number;
  /** Multiplier on score aura alpha. */
  aura: number;
  /** Multiplier on anchor connector alpha. */
  connector: number;
  /** Draw labels for hovered and featured nodes. */
  labels: boolean;
  /** Let the pointer displace nearby nodes. */
  pointer: boolean;
  /** Fraction of buyer nodes kept. Density steps down behind content. */
  buyerKeep: number;
}

export const MODES: Record<GraphMode, ModePreset> = {
  hero: {
    edge: 1,
    node: 1,
    pulse: 1,
    aura: 1,
    connector: 1,
    labels: true,
    pointer: true,
    buyerKeep: 1,
  },
  ambient: {
    edge: 0.52,
    node: 0.6,
    pulse: 0.82,
    aura: 0.5,
    connector: 0.7,
    labels: false,
    pointer: false,
    buyerKeep: 0.75,
  },
  // The terminal labels everything in the DOM already. Canvas labels over dense
  // panel text read as a rendering fault, so compact turns them off and steps the
  // structure back to a texture. Pulses stay at full weight: a payment arriving
  // at a panel border is the reason the layout is built this way.
  compact: {
    edge: 0.44,
    node: 0.46,
    pulse: 1,
    aura: 0.34,
    connector: 1,
    labels: false,
    pointer: true,
    buyerKeep: 0.62,
  },
};

export function preset(mode: GraphMode): ModePreset {
  return MODES[mode] ?? MODES.hero;
}
