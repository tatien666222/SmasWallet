import { useState, useEffect, useCallback, useRef } from 'react';
import { kit, BRIDGE_CHAINS } from '../config/appkit';
import type { ChainBalance } from '../types';

const EMPTY_BALANCES: ChainBalance[] = BRIDGE_CHAINS.map(c => ({
  chain: c.id,
  token: 'USDC' as const,
  amount: '0.00',
  usdValue: 0,
}));

/** Polling interval in milliseconds */
const POLL_INTERVAL_MS = 5_000;

/**
 * Hook that queries the SDK's Unified Balance API to fetch
 * per-chain USDC balances across all supported bridge chains.
 *
 * Uses address-based query per Arc docs:
 * https://docs.arc.io/app-kit/tutorials/unified-balance/check-unified-balance#check-balances-by-address
 */
export function useUnifiedBalance(adapter: any, address: string | null) {
  const [breakdown, setBreakdown] = useState<ChainBalance[]>(EMPTY_BALANCES);
  const [totalUsd, setTotalUsd] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Ref-based guard to prevent concurrent / overlapping fetches
  const isFetchingRef = useRef(false);
  // Keep latest adapter/address accessible inside the interval callback
  const adapterRef = useRef(adapter);
  const addressRef = useRef(address);

  adapterRef.current = adapter;
  addressRef.current = address;

  const fetchBalances = useCallback(async () => {
    const currentAdapter = adapterRef.current;
    const currentAddress = addressRef.current;

    if (!currentAddress || !currentAdapter) {
      setBreakdown(EMPTY_BALANCES);
      setTotalUsd(0);
      return;
    }

    // Skip if a fetch is already in-flight
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      // Use address-based query (no signing needed for balance reads)
      // Per Arc docs: sources: { address, chains? }
      const result = await kit.unifiedBalance.getBalances({
        token: 'USDC',
        networkType: 'testnet',
        sources: {
          address: currentAddress,
        },
      } as any);

      console.log('[UnifiedBalance] SDK response:', JSON.stringify(result, null, 2));

      // Parse SDK response
      const sdkBreakdown = (result as any)?.breakdown || [];
      const sdkBalances = (result as any)?.balances || [];
      const chainBalances: ChainBalance[] = [];

      // Mapping of CCTP domain IDs to our Testnet Chain IDs
      const domainToChain: Record<number, string> = {
        0: 'Ethereum_Sepolia',
        1: 'Avalanche_Fuji',
        2: 'Optimism_Sepolia', // OP
        3: 'Arbitrum_Sepolia',
        6: 'Base_Sepolia',
        7: 'Polygon_Amoy_Testnet',
      };

      if (sdkBalances.length > 0) {
        // Handle actual SDK response format: { balances: [{ domain, balance, ... }] }
        for (const entry of sdkBalances) {
          const domain = entry?.domain;
          const chain = domainToChain[domain] || `Domain_${domain}`;
          const confirmed = parseFloat(entry?.balance || '0');
          
          if (confirmed > 0 || domainToChain[domain]) {
            chainBalances.push({
              chain,
              token: 'USDC',
              amount: confirmed.toFixed(2),
              usdValue: confirmed, // USDC ≈ $1
            });
          }
        }
      } else {
        // Fallback to docs format: { breakdown: [{ breakdown: [{ chain, confirmedBalance }] }] }
        for (const depositor of sdkBreakdown) {
          const depositorBreakdown = depositor?.breakdown || [];
          for (const entry of depositorBreakdown) {
            const chain = entry?.chain || 'Unknown';
            const confirmed = parseFloat(entry?.confirmedBalance || '0');
            chainBalances.push({
              chain,
              token: 'USDC',
              amount: confirmed.toFixed(2),
              usdValue: confirmed,
            });
          }
        }
      }

      // Also check totalConfirmedBalance for a simpler total
      const sdkTotal = parseFloat((result as any)?.totalConfirmedBalance || '0');

      // Ensure all bridge chains are represented
      const chainIds = new Set(chainBalances.map(b => b.chain));
      for (const chain of BRIDGE_CHAINS) {
        if (!chainIds.has(chain.id)) {
          chainBalances.push({
            chain: chain.id,
            token: 'USDC',
            amount: '0.00',
            usdValue: 0,
          });
        }
      }

      // Sort: chains with balance first, then alphabetical
      chainBalances.sort((a, b) => {
        if (a.usdValue !== b.usdValue) return b.usdValue - a.usdValue;
        return a.chain.localeCompare(b.chain);
      });

      const total = sdkTotal > 0
        ? sdkTotal
        : chainBalances.reduce((sum, b) => sum + b.usdValue, 0);

      setBreakdown(chainBalances);
      setTotalUsd(total);
    } catch (err) {
      console.warn('[UnifiedBalance] Failed to fetch:', err);
      // On error, keep existing breakdown — don't overwrite with fallback
      // every time, which would trigger re-renders and more fetches.
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []); // stable — reads refs, no deps needed

  // Trigger initial fetch when address/adapter change
  useEffect(() => {
    fetchBalances();
  }, [adapter, address, fetchBalances]);

  // Stable polling interval — does NOT depend on adapter/address/state,
  // so it never resets mid-cycle.
  useEffect(() => {
    const interval = setInterval(fetchBalances, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return {
    breakdown,
    totalUsd,
    isLoading,
    refetch: fetchBalances,
  };
}
