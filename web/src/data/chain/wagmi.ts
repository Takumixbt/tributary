/*
 * Chain clients. Zone: src/data/**.
 *
 * Arc Testnet only. The config is always mounted, including in demo mode: demo
 * mode means the event stream is simulated, not that wagmi is absent.
 *
 * The transport is a fallback over every endpoint in RPC_URLS. The public Arc
 * testnet RPC rate-limits under the read fan-out this dashboard does on load,
 * and a dropped roster read used to leave the page empty. Now viem promotes the
 * next endpoint for that one request and the read completes.
 */

import { createConfig, fallback, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet } from "viem/chains";
import { RPC_URLS } from "../../lib/env";

export const arcTransport = fallback(
  RPC_URLS.map((url) => http(url, { batch: true, retryCount: 2 })),
  { rank: false },
);

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [arcTestnet.id]: arcTransport,
  },
});

export { arcTestnet };

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
