/*
 * Public API of the data zone. Zone owner: dashboard and data builder.
 * Other zones import from "../data" and nothing deeper.
 */

export { EventStreamProvider, useEventStream } from "./EventStreamProvider";
export {
  useAgent,
  useAgents,
  useBuyers,
  useEventPulse,
  useEvents,
  useEventTape,
  useFeaturedAgent,
  useLenders,
  useSetFeatured,
  useSnapshot,
  useStats,
  useStreamHealth,
  useVaultState,
} from "./hooks";
export type { TributaryStream } from "./types";
export { wagmiConfig, arcTestnet } from "./chain/wagmi";
export { registryAbi, routerAbi, vaultAbi, erc20Abi } from "./chain/abi";
