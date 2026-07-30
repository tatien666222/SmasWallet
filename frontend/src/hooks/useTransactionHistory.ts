import { useCallback, useEffect, useState } from 'react';
import type { TransactionRecord } from '../types';
import { fetchTransactionsFromApi, saveTransactionToApi } from '../services/api';
import { useWallet } from '../contexts/WalletContext';

const MAX_RECORDS = 100;

export function useTransactionHistory() {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  // Fetch transaction history directly from Backend SQLite Database
  useEffect(() => {
    if (!address) {
      setTransactions([]);
      return;
    }

    let isMounted = true;
    fetchTransactionsFromApi(address).then(apiTxs => {
      if (!isMounted) return;
      if (apiTxs) {
        const sorted = [...apiTxs].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ).slice(0, MAX_RECORDS);
        setTransactions(sorted);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [address]);

  const addTransaction = useCallback((tx: TransactionRecord) => {
    // Immediate UI state update
    setTransactions(prev => [tx, ...prev].slice(0, MAX_RECORDS));

    // Save directly to Backend SQLite Database
    const walletAddr = address || tx.walletAddress || '0x0000000000000000000000000000000000000000';
    saveTransactionToApi({
      walletAddress: walletAddr,
      type: tx.type,
      sourceChain: tx.sourceChain,
      destChain: tx.destChain,
      tokenIn: tx.tokenIn,
      tokenOut: tx.tokenOut,
      amountIn: tx.amountIn,
      amountOut: tx.amountOut,
      status: tx.status,
      txHash: tx.txHash,
      txHashDest: tx.txHashDest,
      explorerUrl: tx.explorerUrl,
    });
  }, [address]);

  const updateTransaction = useCallback(
    (id: string, updates: Partial<TransactionRecord>) => {
      setTransactions(prev =>
        prev.map(tx => (tx.id === id ? { ...tx, ...updates } : tx)),
      );
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setTransactions([]);
  }, []);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    clearHistory,
  };
}
