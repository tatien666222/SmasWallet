import { Router } from 'express';
import { priceService } from '../services/PriceService.js';

export const priceRouter = Router();

// GET /api/prices?tokens=USDC,EURC,ETH
priceRouter.get('/', (req, res) => {
  const tokensQuery = req.query.tokens as string;
  let tokens: string[] | undefined;

  if (tokensQuery) {
    tokens = tokensQuery.split(',');
  }

  const prices = priceService.getPrices(tokens);
  res.status(200).json(prices);
});
