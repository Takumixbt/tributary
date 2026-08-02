import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import { arcTestnet } from "viem/chains";
import type { Address } from "viem";

import { erc20Abi, vaultAbi } from "../data/chain/abi";
import { ADDRESSES, hasChainConfig } from "../lib/env";

export const ARC_CHAIN_ID = arcTestnet.id;

export function shortAddress(address?: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Everything the interface needs to know about the visitor's wallet: whether
 * they are connected, whether they are on Arc, what they hold, and what their
 * position in the vault is worth right now.
 */
export function useWallet() {
  // The wallet's own chain, not the config's. useChainId() falls back to the
  // first configured chain when the wallet sits on one we do not list, which
  // made a wallet on mainnet look like it was already on Arc: the form opened,
  // and the write then failed at signing time instead of prompting a switch.
  const { address, isConnected, connector, chainId } = useAccount();
  const { connectors, connect, isPending: connecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== ARC_CHAIN_ID;

  /**
   * Move the wallet onto Arc, adding the network if it has never seen it.
   * Without the add parameters a wallet that lacks Arc simply refuses, and the
   * visitor is left on whatever chain they were already on. Gas on Arc is USDC,
   * so a transaction signed elsewhere would spend that chain's native token.
   */
  const switchToArc = useCallback(() => {
    switchChain({
      chainId: ARC_CHAIN_ID,
      addEthereumChainParameter: {
        chainName: arcTestnet.name,
        nativeCurrency: arcTestnet.nativeCurrency,
        rpcUrls: [...arcTestnet.rpcUrls.default.http],
        blockExplorerUrls: [arcTestnet.blockExplorers.default.url],
      },
    });
  }, [switchChain]);

  // Ask for Arc the moment a wallet turns up on the wrong chain, so the switch
  // is the first thing that happens rather than a failure at signing time.
  const asked = useRef(false);
  useEffect(() => {
    if (!wrongNetwork) {
      asked.current = false;
      return;
    }
    if (asked.current) return;
    asked.current = true;
    switchToArc();
  }, [wrongNetwork, switchToArc]);

  // Gas balance is the same pool as USDC on Arc, read through the ERC-20 view.
  const usdc = useReadContract({
    address: ADDRESSES.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && !wrongNetwork, refetchInterval: 12_000 },
  });

  const shares = useReadContract({
    address: ADDRESSES.vault as Address,
    abi: vaultAbi,
    functionName: "sharesOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ADDRESSES.vault) && !wrongNetwork, refetchInterval: 12_000 },
  });

  const position = useReadContract({
    address: ADDRESSES.vault as Address,
    abi: vaultAbi,
    functionName: "convertToAssets",
    args: [shares.data ?? 0n],
    query: {
      enabled: Boolean(ADDRESSES.vault) && (shares.data ?? 0n) > 0n && !wrongNetwork,
      refetchInterval: 12_000,
    },
  });

  const refresh = useCallback(() => {
    void usdc.refetch();
    void shares.refetch();
    void position.refetch();
  }, [usdc, shares, position]);

  const ready = useMemo(
    () => connectors.filter((c) => c.type === "injected" || c.ready !== false),
    [connectors],
  );

  return {
    address,
    isConnected,
    connectorName: connector?.name,
    chainId,
    wrongNetwork,
    connectors: ready,
    connect,
    /** Connect the only wallet present, so a chooser of one is never shown. */
    connectFirst: () => {
      const first = ready[0];
      if (first) connect({ connector: first });
    },
    connecting,
    connectError,
    disconnect,
    /**
     * Move the wallet onto Arc, adding the network if it has never seen it.
     * Without the add parameters a wallet that lacks Arc simply refuses, and
     * the visitor is left on whatever chain they were already on. Gas on Arc is
     * USDC, so a transaction signed on the wrong chain would spend that chain's
     * native token instead. Nothing may be signed until this succeeds.
     */
    switchToArc,
    switching,
    usdcBalance: (usdc.data as bigint | undefined) ?? 0n,
    shares: (shares.data as bigint | undefined) ?? 0n,
    positionValue: (position.data as bigint | undefined) ?? 0n,
    hasContracts: hasChainConfig,
    refresh,
  };
}

/** Unused elsewhere, but keeps the balance hook available for native reads. */
export { useBalance };
