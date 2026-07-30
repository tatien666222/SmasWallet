import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import type {
  Transaction,
  CreateTransactionDto,
  UpdateTransactionStatusDto,
  PaginatedResponse,
} from '../types/index.js';

export class TransactionService {
  public async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    const now = new Date().toISOString();
    const tx: Transaction = {
      id: uuidv4(),
      walletAddress: dto.walletAddress,
      type: dto.type,
      sourceChain: dto.sourceChain,
      destChain: dto.destChain || dto.sourceChain,
      tokenIn: dto.tokenIn,
      tokenOut: dto.tokenOut || dto.tokenIn,
      amountIn: dto.amountIn,
      amountOut: dto.amountOut,
      feeAmount: dto.feeAmount,
      status: dto.status || 'pending',
      txHash: dto.txHash,
      txHashDest: dto.txHashDest,
      explorerUrl: dto.explorerUrl,
      createdAt: now,
      updatedAt: now,
    };

    return db.insertTransaction(tx);
  }

  public async getTransactionsByWallet(
    walletAddress: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResponse<Transaction>> {
    const { data, total } = await db.getTransactionsByWallet(walletAddress, limit, offset);
    return {
      data,
      total,
      limit,
      offset,
    };
  }

  public async updateTransactionStatus(
    id: string,
    dto: UpdateTransactionStatusDto
  ): Promise<Transaction | undefined> {
    return db.updateTransactionStatus(id, dto.status, dto.txHashDest, dto.amountOut);
  }

  public async getTransactionById(id: string): Promise<Transaction | undefined> {
    return db.getTransactionById(id);
  }
}

export const transactionService = new TransactionService();
