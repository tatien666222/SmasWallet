import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { transactionRouter } from './routes/transactions.js';
import { priceRouter } from './routes/prices.js';
import { authRouter } from './routes/auth.js';
import { swapRouter } from './routes/swap.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

export const app = express();

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  })
);
app.use(express.json());

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/transactions', transactionRouter);
app.use('/api/prices', priceRouter);
app.use('/api/auth', authRouter);
app.use('/api/swap', swapRouter);

// Centralized Error Handling
app.use(errorHandler);
