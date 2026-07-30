import type { Request, Response, NextFunction } from 'express';
import type { ApiErrorResponse } from '../types/index.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', err.stack || err.message);

  const response: ApiErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred on the server.',
    },
  };

  res.status(500).json(response);
}
