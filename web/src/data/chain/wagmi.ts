/*
 * Chain clients. Zone: src/data/**.
 *
 * Arc Testnet only. USDC is gas here, so there is no separate fee asset to show
 * anywhere in the UI. The config is always mounted, including in demo mode:
 * demo mode means the event stream is simulated, not that wagmi is absent.
 */

import { createConfig, http } from "wagmi";
import { arcTestnet } from "viem/chains";
import { RPC_URL } from "../../lib/env";

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http(RPC_URL, { batch: true, retryCount: 2 }),
  },
});

export { arcTestnet };

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
