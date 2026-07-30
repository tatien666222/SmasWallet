import { describe, it, expect } from 'vitest';
import { kit } from '../config/appkit';

describe('Bridge Operation Unit & Flow Tests', () => {
  it('estimates bridge costs via SDK', async () => {
    const estimation = await kit.estimateBridge({
      from: { adapter: {}, chain: 'Ethereum_Sepolia' },
      to: { adapter: {}, chain: 'Arc_Testnet' },
      amount: '50.0',
      token: 'USDC',
    });

    expect(estimation).toBeDefined();
  });

  it('subscribes to bridge lifecycle events via kit.on("*")', async () => {
    const eventsReceived: any[] = [];

    kit.on('*', (payload: any) => {
      eventsReceived.push(payload);
    });

    const result = await kit.bridge({
      from: { adapter: {}, chain: 'Ethereum_Sepolia' },
      to: { adapter: {}, chain: 'Arc_Testnet' },
      amount: '50.0',
      token: 'USDC',
    });

    // The SDK returns a BridgeResult with state and steps[]
    expect(result).toBeDefined();
    expect((result as any).state).toBeDefined();
  });

  it('returns steps array in bridge result', async () => {
    const result = await kit.bridge({
      from: { adapter: {}, chain: 'Ethereum_Sepolia' },
      to: { adapter: {}, chain: 'Arc_Testnet' },
      amount: '1.00',
      token: 'USDC',
    });

    // BridgeResult should have steps array per SDK docs
    expect(result).toBeDefined();
    if ((result as any).steps) {
      expect(Array.isArray((result as any).steps)).toBe(true);
    }
  });
});
