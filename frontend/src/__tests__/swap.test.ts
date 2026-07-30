import { describe, it, expect } from 'vitest';
import { kit } from '../config/appkit';

describe('Swap Operation Unit & Flow Tests', () => {
  it('calculates swap quote correctly for USDC to EURC', async () => {
    const quote = await kit.estimateSwap({
      tokenIn: 'USDC',
      tokenOut: 'EURC',
      amountIn: '100.00',
    });

    expect(quote).toBeDefined();
    expect(parseFloat(quote.amountOut)).toBeLessThan(100.00); // EURC rate ~0.92
    expect(parseFloat(quote.minAmountOut)).toBeLessThan(parseFloat(quote.amountOut));
    expect(quote.slippage).toBe('0.5%');
  });

  it('calculates swap quote correctly for EURC to USDC', async () => {
    const quote = await kit.estimateSwap({
      tokenIn: 'EURC',
      tokenOut: 'USDC',
      amountIn: '100.00',
    });

    expect(quote).toBeDefined();
    expect(parseFloat(quote.amountOut)).toBeGreaterThan(100.00); // USDC rate ~1.087
  });

  it('executes swap transaction and generates txHash', async () => {
    const res = await kit.swap({
      from: { adapter: {}, chain: 'Arc_Testnet' },
      tokenIn: 'USDC',
      tokenOut: 'EURC',
      amountIn: '50.00',
    });

    expect(res).toBeDefined();
    expect(res.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(res.tokenIn).toBe('USDC');
    expect(res.tokenOut).toBe('EURC');
    expect(parseFloat(res.amountOut)).toBeGreaterThan(0);
  });
});
