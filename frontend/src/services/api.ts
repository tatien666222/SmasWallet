import type { TransactionRecord } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface CreateTxPayload {
  walletAddress: string;
  type: 'send' | 'bridge' | 'swap';
  sourceChain: string;
  destChain?: string;
  tokenIn: string;
  tokenOut?: string;
  amountIn: string;
  amountOut?: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash: string;
  txHashDest?: string;
  explorerUrl?: string;
}

export async function fetchTransactionsFromApi(walletAddress: string): Promise<TransactionRecord[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/transactions?wallet=${encodeURIComponent(walletAddress)}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }
    const json = await res.json();
    if (json.data && Array.isArray(json.data)) {
      return json.data.map((tx: any) => ({
        id: tx.id,
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
        createdAt: tx.createdAt,
      }));
    }
    return [];
  } catch (err) {
    console.warn('Failed to fetch transactions from backend API:', err);
    return [];
  }
}

export async function saveTransactionToApi(payload: CreateTxPayload): Promise<TransactionRecord | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }
    const tx = await res.json();
    return {
      id: tx.id,
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
      createdAt: tx.createdAt,
    };
  } catch (err) {
    console.warn('Failed to save transaction to backend API:', err);
    return null;
  }
}

export async function fetchTokenPrices(tokens: string[] = ['USDC', 'EURC', 'cirBTC']): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${API_BASE_URL}/prices?tokens=${tokens.join(',')}`);
    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch prices from backend API, using fallback:', err);
    return { USDC: 1.0, EURC: 1.08, cirBTC: 65000.0 };
  }
}

export async function estimateSwapFromApi(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  chain?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/swap/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.estimate) return json.estimate;
    }
  } catch (err) {
    console.warn('Backend swap estimate call error:', err);
  }
  return null;
}

export async function executeSwapFromApi(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  chain?: string;
  walletAddress?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/swap/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend swap execute call error:', err);
  }
  return null;
}
