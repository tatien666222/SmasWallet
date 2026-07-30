import { Router } from 'express';
import { transactionService } from '../services/TransactionService.js';
import { validateCreateTransaction, isValidEthereumAddress } from '../middleware/validator.js';

export const transactionRouter = Router();

// GET /api/transactions?wallet=0x1234&limit=20&offset=0
transactionRouter.get('/', async (req, res) => {
  const wallet = req.query.wallet as string;
  const limit = parseInt((req.query.limit as string) || '20', 10);
  const offset = parseInt((req.query.offset as string) || '0', 10);

  if (!wallet || !isValidEthereumAddress(wallet)) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Valid wallet address parameter (wallet=0x...) is required.',
      },
    });
    return;
  }

  const result = await transactionService.getTransactionsByWallet(wallet, limit, offset);
  res.status(200).json(result);
});

// POST /api/transactions
transactionRouter.post('/', validateCreateTransaction, async (req, res) => {
  const tx = await transactionService.createTransaction(req.body);
  res.status(201).json(tx);
});

// PATCH /api/transactions/:id/status
transactionRouter.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, txHashDest, amountOut } = req.body;

  if (!status || !['pending', 'confirmed', 'failed'].includes(status)) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'status must be pending, confirmed, or failed.',
      },
    });
    return;
  }

  const updated = await transactionService.updateTransactionStatus(id, {
    status,
    txHashDest,
    amountOut,
  });

  if (!updated) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Transaction with id ${id} not found.`,
      },
    });
    return;
  }

  res.status(200).json(updated);
});
