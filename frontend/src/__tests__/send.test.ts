import { describe, it, expect } from 'vitest';
import { isValidAddress, isValidAmount, isAmountExceedsBalance } from '../utils/validation';
import { kit } from '../config/appkit';

describe('Send Operation Unit & Flow Tests', () => {
  it('validates Ethereum recipient addresses correctly', () => {
    expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(true);
    expect(isValidAddress('invalid-address')).toBe(false);
    expect(isValidAddress('')).toBe(false);
  });

  it('validates send amounts correctly', () => {
    expect(isValidAmount('10.5')).toBe(true);
    expect(isValidAmount('0')).toBe(false);
    expect(isValidAmount('-5')).toBe(false);
    expect(isValidAmount('abc')).toBe(false);
  });

  it('checks balance limits for send', () => {
    expect(isAmountExceedsBalance('100.00', '50.00')).toBe(true);
    expect(isAmountExceedsBalance('25.00', '50.00')).toBe(false);
    expect(isAmountExceedsBalance('50.00', '50.00')).toBe(false);
  });

  it('estimates send gas and fee', async () => {
    const estimation = await kit.estimateSend({
      from: { adapter: {}, chain: 'Arc_Testnet' },
      to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      amount: '10.0',
      token: 'USDC',
    });

    expect(estimation).toBeDefined();
    expect(typeof estimation.fee).toBe('string');
    expect(typeof estimation.gasPrice).toBe('bigint');
  });

  it('executes send transaction successfully and generates valid txHash', async () => {
    const res = await kit.send({
      from: { adapter: {}, chain: 'Arc_Testnet' },
      to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      amount: '10.0',
      token: 'USDC',
    });

    expect(res.state).toBe('success');
    expect(res.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(res.explorerUrl).toContain(res.txHash);
  });
});
