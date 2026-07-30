import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTransactionsFromApi, saveTransactionToApi, fetchTokenPrices } from '../services/api';

describe('Frontend API Client Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches transactions for a wallet address from backend API', async () => {
    const mockTxs = [
      {
        id: 'tx-1',
        type: 'send',
        sourceChain: 'Arc_Testnet',
        destChain: 'Arc_Testnet',
        tokenIn: 'USDC',
        tokenOut: 'USDC',
        amountIn: '10.0',
        amountOut: '10.0',
        status: 'confirmed',
        txHash: '0x123',
        createdAt: '2026-07-29T12:00:00Z',
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockTxs }),
    } as Response);

    const result = await fetchTransactionsFromApi('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tx-1');
    expect(result[0].type).toBe('send');
  });

  it('posts new transaction to backend API', async () => {
    const payload = {
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      type: 'send' as const,
      sourceChain: 'Arc_Testnet',
      destChain: 'Arc_Testnet',
      tokenIn: 'USDC',
      amountIn: '25.0',
      status: 'confirmed' as const,
      txHash: '0xabc',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'tx-created', ...payload, createdAt: '2026-07-29T12:00:00Z' }),
    } as Response);

    const result = await saveTransactionToApi(payload);
    expect(result).toBeDefined();
    expect(result?.id).toBe('tx-created');
    expect(result?.txHash).toBe('0xabc');
  });

  it('fetches token prices with fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ USDC: 1.0, EURC: 1.08 }),
    } as Response);

    const prices = await fetchTokenPrices(['USDC', 'EURC']);
    expect(prices.USDC).toBe(1.0);
    expect(prices.EURC).toBe(1.08);
  });
});
