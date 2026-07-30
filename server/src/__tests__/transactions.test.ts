import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Backend Transactions API Integration Tests', () => {
  const testWallet = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
  let createdTxId: string;

  it('health check returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects GET /api/transactions without wallet parameter', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('creates a new transaction (POST /api/transactions)', async () => {
    const payload = {
      walletAddress: testWallet,
      type: 'send',
      sourceChain: 'Arc_Testnet',
      destChain: 'Arc_Testnet',
      tokenIn: 'USDC',
      tokenOut: 'USDC',
      amountIn: '100.00',
      amountOut: '100.00',
      status: 'pending',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      explorerUrl: 'https://testnet.arcscan.app/tx/0x1234567890abcdef',
    };

    const res = await request(app)
      .post('/api/transactions')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.walletAddress).toBe(testWallet);
    expect(res.body.status).toBe('pending');

    createdTxId = res.body.id;
  });

  it('queries transaction history by wallet (GET /api/transactions?wallet=...)', async () => {
    const res = await request(app)
      .get(`/api/transactions?wallet=${testWallet}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].walletAddress).toBe(testWallet);
  });

  it('updates transaction status (PATCH /api/transactions/:id/status)', async () => {
    expect(createdTxId).toBeDefined();

    const res = await request(app)
      .patch(`/api/transactions/${createdTxId}/status`)
      .send({
        status: 'confirmed',
        txHashDest: '0x9999999999999999999999999999999999999999999999999999999999999999',
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdTxId);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.txHashDest).toBeDefined();
  });
});
