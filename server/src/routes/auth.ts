import { Router } from 'express';
import { authService } from '../services/AuthService.js';
import { isValidEthereumAddress } from '../middleware/validator.js';

export const authRouter = Router();

// GET /api/auth/nonce?wallet=0x1234
authRouter.get('/nonce', (req, res) => {
  const wallet = req.query.wallet as string;

  if (!wallet || !isValidEthereumAddress(wallet)) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Valid wallet address parameter (wallet=0x...) is required.',
      },
    });
    return;
  }

  const response = authService.generateNonce(wallet);
  res.status(200).json(response);
});

// POST /api/auth/verify
authRouter.post('/verify', (req, res) => {
  const { walletAddress, signature, nonce } = req.body;

  if (!walletAddress || !isValidEthereumAddress(walletAddress) || !signature || !nonce) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'walletAddress, signature, and nonce are required.',
      },
    });
    return;
  }

  try {
    const result = authService.verifySignature(walletAddress, signature, nonce);
    res.status(200).json(result);
  } catch (err) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: err instanceof Error ? err.message : 'Authentication failed.',
      },
    });
  }
});
