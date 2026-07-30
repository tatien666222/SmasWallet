/* ============================================================
   Transaction Record — persisted in localStorage
   ============================================================ */
export interface TransactionRecord {
  id: string;
  type: 'send' | 'bridge' | 'swap';
  sourceChain: string;
  destChain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut?: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash: string;
  txHashDest?: string;
  explorerUrl?: string;
  createdAt: string; // ISO 8601
}

/* ============================================================
   Balance types
   ============================================================ */
export interface ChainBalance {
  chain: string;
  token: string;
  amount: string;
  usdValue: number;
}

export interface UnifiedBalanceView {
  totalUsdEquivalent: number;
  breakdown: ChainBalance[];
  isLoading: boolean;
}

/* ============================================================
   Supported chains & tokens
   ============================================================ */
export interface ChainInfo {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  explorerUrl: string;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
}

/* ============================================================
   Form state machines
   ============================================================ */
export type SendStep =
  | 'input'
  | 'estimating'
  | 'preview'
  | 'signing'
  | 'pending'
  | 'confirmed'
  | 'error';

export type BridgeStep =
  | 'input'
  | 'estimating'
  | 'preview'
  | 'approve'
  | 'burn'
  | 'fetchAttestation'
  | 'mint'
  | 'confirmed'
  | 'error';

export type SwapStep =
  | 'input'
  | 'estimating'
  | 'preview'
  | 'signing'
  | 'pending'
  | 'confirmed'
  | 'error';

/* ============================================================
   Wallet state
   ============================================================ */
export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  adapter: unknown | null; // ViemAdapter from @circle-fin/adapter-viem-v2
  provider?: unknown | null;
  error: string | null;
}
