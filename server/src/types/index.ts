export type TransactionType = 'send' | 'bridge' | 'swap';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  id: string;
  walletAddress: string;
  type: TransactionType;
  sourceChain: string;
  destChain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut?: string;
  feeAmount?: string;
  status: TransactionStatus;
  txHash: string;
  txHashDest?: string;
  explorerUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionDto {
  walletAddress: string;
  type: TransactionType;
  sourceChain: string;
  destChain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut?: string;
  feeAmount?: string;
  status?: TransactionStatus;
  txHash: string;
  txHashDest?: string;
  explorerUrl?: string;
}

export interface UpdateTransactionStatusDto {
  status: TransactionStatus;
  txHashDest?: string;
  amountOut?: string;
}

export interface PriceResponse {
  prices: Record<string, number>;
  updatedAt: string;
  source: string;
}

export interface AuthNonceResponse {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface AuthVerifyDto {
  walletAddress: string;
  signature: string;
  nonce: string;
}

export interface AuthVerifyResponse {
  token: string;
  walletAddress: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
