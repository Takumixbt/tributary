/*
 * What is actually deployed, and where to look at it.
 *
 * These are the live Arc testnet addresses. They are constants rather than
 * environment reads because the page states them as fact on every build: the
 * environment variables only decide whether the front end reads the chain, not
 * whether the chain exists.
 */

import { ADDRESSES } from "./env";
import type { Address } from "./types";

export const EXPLORER = "https://testnet.arcscan.app";

export interface Deployed {
  key: "vault" | "registry" | "router";
  name: string;
  role: string;
  address: Address;
}

export const DEPLOYED: Deployed[] = [
  {
    key: "vault",
    name: "TributaryVault",
    role: "Holds lender USDC, prices lines per second, books interest",
    address: ADDRESSES.vault,
  },
  {
    key: "registry",
    name: "AgentRegistry",
    role: "Agent identity, router binding, the score of record",
    address: ADDRESSES.registry,
  },
  {
    key: "router",
    name: "RevenueRouter",
    role: "Splits every incoming payment until the debt clears",
    address: ADDRESSES.router,
  },
];

export function explorerAddress(address: Address): string {
  return `${EXPLORER}/address/${address}`;
}
