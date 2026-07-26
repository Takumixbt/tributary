/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAULT_ADDRESS?: string;
  readonly VITE_REGISTRY_ADDRESS?: string;
  readonly VITE_ROUTER_ADDRESS?: string;
  readonly VITE_USDC_ADDRESS?: string;
  readonly VITE_ARC_RPC_URL?: string;
  readonly VITE_STREAM_MODE?: "demo" | "chain" | "";
  readonly VITE_DEMO_SEED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
