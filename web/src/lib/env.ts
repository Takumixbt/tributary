/*
 * Runtime configuration and mode selection. FROZEN: owned by the design lead.
 *
 * Demo mode is not a fallback, it is a first-class mode. The rule:
 *   ?demo=1            -> demo, always
 *   ?demo=0            -> chain, always (will show a stalled stream if broken)
 *   VITE_STREAM_MODE   -> explicit override
 *   otherwise          -> demo when any required address is missing
 */

import type { Address, StreamMode } from "./types";

/** Arc Testnet. USDC is gas here. */
export const ARC_CHAIN_ID = 5042002;
export const ARC_RPC_FALLBACK = "https://rpc.testnet.arc.network";
export const USDC_FALLBACK = "0x3600000000000000000000000000000000000000" as Address;

function readEnv(key: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function asAddress(value: string): Address | null {
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Address) : null;
}

function query(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

const params = query();

export const ADDRESSES = {
  vault: asAddress(readEnv("VITE_VAULT_ADDRESS")),
  registry: asAddress(readEnv("VITE_REGISTRY_ADDRESS")),
  router: asAddress(readEnv("VITE_ROUTER_ADDRESS")),
  usdc: asAddress(readEnv("VITE_USDC_ADDRESS")) ?? USDC_FALLBACK,
} as const;

export const RPC_URL = readEnv("VITE_ARC_RPC_URL") || ARC_RPC_FALLBACK;

/** True when the chain has everything the reader needs. */
export const hasChainConfig = Boolean(ADDRESSES.vault && ADDRESSES.registry);

function resolveMode(): StreamMode {
  const flag = params.get("demo");
  if (flag === "1" || flag === "true") return "demo";
  if (flag === "0" || flag === "false") return "chain";
  const explicit = readEnv("VITE_STREAM_MODE");
  if (explicit === "demo" || explicit === "chain") return explicit;
  return hasChainConfig ? "chain" : "demo";
}

export const STREAM_MODE: StreamMode = resolveMode();
export const IS_DEMO = STREAM_MODE === "demo";

/**
 * Seeds the simulator PRNG. Same seed means the same choreography, every run,
 * so the demo video and live judging show an identical lifecycle.
 */
export const DEMO_SEED = params.get("seed") || readEnv("VITE_DEMO_SEED") || "tributary";

/** `?speed=2` runs the demo clock twice as fast. Clamped to keep 60fps honest. */
export const DEMO_SPEED = (() => {
  const raw = Number(params.get("speed"));
  return Number.isFinite(raw) && raw > 0 ? Math.min(4, Math.max(0.25, raw)) : 1;
})();

/** `?motion=0` forces the reduced-motion path for testing. */
export const FORCE_REDUCED_MOTION = params.get("motion") === "0";

/** `?debug=1` shows frame timing and node counts on the graph stage. */
export const DEBUG = params.get("debug") === "1";
