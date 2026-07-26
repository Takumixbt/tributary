import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (run scripts with --env-file=../.env)`);
  return v;
}

function envOr(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const RPC_URL = envOr("ARC_TESTNET_RPC_URL", "https://rpc.testnet.arc.network");
export const USDC = "0x3600000000000000000000000000000000000000" as Address;
export const GATEWAY_API = "https://gateway-api-testnet.circle.com";

// Contract addresses, populated after deployment
export const VAULT = (process.env.VAULT_ADDRESS ?? "") as Address;
export const REGISTRY = (process.env.REGISTRY_ADDRESS ?? "") as Address;
export const ROUTER = (process.env.ROUTER_ADDRESS ?? "") as Address;

export const publicClient = createPublicClient({ chain: arcTestnet, transport: http(RPC_URL) });

export function walletFor(envKey: string) {
  const account = privateKeyToAccount(env(envKey) as Hex);
  return {
    account,
    client: createWalletClient({ account, chain: arcTestnet, transport: http(RPC_URL) }),
  };
}

export const agentKey = () => env("AGENT_PRIVATE_KEY") as Hex;
export const underwriterKey = () => env("UNDERWRITER_PRIVATE_KEY") as Hex;

export function requireAddress(value: Address, name: string): Address {
  if (!value || value.length !== 42) {
    throw new Error(`${name} not set in .env yet (deploy contracts first)`);
  }
  return value;
}
