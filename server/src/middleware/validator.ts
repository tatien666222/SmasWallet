import type { Request, Response, NextFunction } from 'express';

export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function validateCreateTransaction(req: Request, res: Response, next: NextFunction): void {
  const { walletAddress, type, sourceChain, amountIn, txHash } = req.body;

  if (!walletAddress || !isValidEthereumAddress(walletAddress)) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid or missing walletAddress format (must be 0x + 40 hex chars).',
      },
    });
    return;
  }

  if (!type || !['send', 'bridge', 'swap'].includes(type)) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid type. Must be send, bridge, or swap.',
      },
    });
    return;
  }

  if (!sourceChain || typeof sourceChain !== 'string') {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Missing or invalid sourceChain.',
      },
    });
    return;
  }

  if (!amountIn || isNaN(parseFloat(amountIn)) || parseFloat(amountIn) <= 0) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'amountIn must be a positive numeric string.',
      },
    });
    return;
  }

  if (!txHash || typeof txHash !== 'string') {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Missing txHash string.',
      },
    });
    return;
  }

  next();
}
