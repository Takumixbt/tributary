/*
 * Runtime configuration and mode selection.
 *
 * Chain is the default and the simulator is the exception. The rule:
 *   ?demo=1            -> demo, and the dashboard says so on screen
 *   VITE_STREAM_MODE   -> explicit override, left blank in the shipped env
 *   otherwise          -> chain whenever the addresses are configured
 *   no addresses       -> demo, because there is nothing to read
 *
 * The deployed .env carries the three live Arc testnet addresses, so a visitor
 * who does not ask for the simulator never sees it.
 */

import type { Address, StreamMode } from "./types";

/** Arc Testnet. */
export const ARC_CHAIN_ID = 5042002;
/**
 * The browser primary. Arc's own endpoint answers a curl but sends no
 * Access-Control-Allow-Origin, so a page cannot read it: every request fails
 * preflight and the dashboard sits empty. dRPC serves the same chain with CORS,
 * so it leads here. The offchain agents, which have no origin, still use Arc's
 * endpoint directly.
 */
export const ARC_RPC_PRIMARY = "https://arc-testnet.drpc.org";
/**
 * No second endpoint by default. Arc's own RPC is the obvious candidate and it
 * is deliberately absent: without CORS headers every browser request to it
 * fails, and having it in the list only spends a retry per read on a call that
 * cannot succeed. Set VITE_ARC_RPC_FALLBACK_URL to any CORS-enabled endpoint to
 * add one back.
 */
export const ARC_RPC_SECONDARY = "";
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

export const RPC_URL = readEnv("VITE_ARC_RPC_URL") || ARC_RPC_PRIMARY;

/**
 * Every endpoint the reader may use, in order of preference. viem's fallback
 * transport walks this list per request, so a rate-limited primary costs one
 * retry rather than a blank dashboard.
 */
export const RPC_URLS: readonly string[] = [
  RPC_URL,
  readEnv("VITE_ARC_RPC_FALLBACK_URL") || ARC_RPC_SECONDARY,
].filter((url, index, all) => url.length > 0 && all.indexOf(url) === index);

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
