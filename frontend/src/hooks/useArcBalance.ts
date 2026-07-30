import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { arcTestnet, ARC_TESTNET_RPC_URL } from '../config/chain';

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(ARC_TESTNET_RPC_URL),
});

export function useArcBalance(address: string | null) {
  const [balance, setBalance] = useState<string>('0.00');
  const [rawBalance, setRawBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const isFetchingRef = useRef(false);
  const addressRef = useRef(address);
  addressRef.current = address;

  const fetchBalance = useCallback(async () => {
    const currentAddress = addressRef.current;
    
    if (!currentAddress || !currentAddress.startsWith('0x')) {
      setBalance('0.00');
      setRawBalance(0n);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    setIsError(false);

    try {
      const result = await publicClient.getBalance({
        address: currentAddress as `0x${string}`,
      });
      setRawBalance(result);
      
      // Arc Testnet native token USDC uses 18 decimals internally
      const formatted = formatUnits(result, 18);
      const parsed = parseFloat(formatted);
      setBalance(isNaN(parsed) ? '0.00' : parsed.toFixed(2));
    } catch (err) {
      console.error('Failed to fetch Arc Testnet balance from RPC:', err);
      setIsError(true);
      // Keep previous or fallback
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []); // stable reference

  useEffect(() => {
    // Initial fetch
    fetchBalance();

    // Stable interval that won't reset on address changes
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  // Trigger when address changes
  useEffect(() => {
    fetchBalance();
  }, [address, fetchBalance]);

  return {
    balance,
    rawBalance,
    isLoading,
    isError,
    refetch: fetchBalance,
  };
}
