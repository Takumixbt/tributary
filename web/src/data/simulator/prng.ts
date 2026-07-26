/*
 * Deterministic randomness. Zone: src/data/**.
 *
 * Demo-mode determinism is a feature, not a shortcut: the same seed produces the
 * same choreography every run, so the demo video and live judging show an
 * identical lend, earn, split, repay lifecycle. Never call Math.random anywhere
 * in the simulator.
 */

/** FNV-1a. Turns a seed string into a 32-bit integer. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max]. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Pick one element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Log-uniform in [min, max): the right shape for nanopayment amounts. */
  logRange(min: number, max: number): number;
}

/** mulberry32: small, fast, good enough, and reproducible across engines. */
export function createRng(seed: string | number): Rng {
  let state = (typeof seed === "string" ? hashSeed(seed) : seed) >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    range: (min, max) => min + next() * (max - min),
    pick: (items) => {
      if (items.length === 0) throw new Error("pick() on an empty array");
      return items[Math.floor(next() * items.length)]!;
    },
    chance: (p) => next() < p,
    logRange: (min, max) => {
      const lo = Math.log(Math.max(min, 1e-9));
      const hi = Math.log(Math.max(max, 1e-9));
      return Math.exp(lo + next() * (hi - lo));
    },
  };
}