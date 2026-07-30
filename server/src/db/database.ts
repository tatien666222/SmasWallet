import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Transaction } from '../types/index.js';

/* ------------------------------------------------------------------ */
/*  Supabase client                                                    */
/* ------------------------------------------------------------------ */

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[Database] Supabase client initialized');
} else {
  console.warn('[Database] SUPABASE_URL or SUPABASE_SERVICE_KEY not set — using in-memory fallback');
}

/* ------------------------------------------------------------------ */
/*  Row ↔ Domain mapping helpers                                       */
/* ------------------------------------------------------------------ */

interface TransactionRow {
  id: string;
  wallet_address: string;
  type: string;
  source_chain: string;
  dest_chain: string | null;
  token_in: string;
  token_out: string | null;
  amount_in: string;
  amount_out: string | null;
  fee_amount: string | null;
  status: string;
  tx_hash: string;
  tx_hash_dest: string | null;
  explorer_url: string | null;
  created_at: string;
  updated_at: string;
}

function rowToTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    walletAddress: r.wallet_address,
    type: r.type as Transaction['type'],
    sourceChain: r.source_chain,
    destChain: r.dest_chain ?? '',
    tokenIn: r.token_in,
    tokenOut: r.token_out ?? '',
    amountIn: r.amount_in,
    amountOut: r.amount_out ?? undefined,
    feeAmount: r.fee_amount ?? undefined,
    status: r.status as Transaction['status'],
    txHash: r.tx_hash,
    txHashDest: r.tx_hash_dest ?? undefined,
    explorerUrl: r.explorer_url ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ------------------------------------------------------------------ */
/*  DatabaseStore — Supabase-backed with in-memory fallback            */
/* ------------------------------------------------------------------ */

class DatabaseStore {
  private inMemoryTxs: Map<string, Transaction> = new Map();
  private inMemoryNonces: Map<string, { nonce: string; expiresAt: number }> = new Map();

  /* -------- Transactions -------- */

  public async insertTransaction(tx: Transaction): Promise<Transaction> {
    if (supabase) {
      try {
        const { error } = await supabase.from('transactions').insert({
          id: tx.id,
          wallet_address: tx.walletAddress.toLowerCase(),
          type: tx.type,
          source_chain: tx.sourceChain,
          dest_chain: tx.destChain || null,
          token_in: tx.tokenIn,
          token_out: tx.tokenOut || null,
          amount_in: tx.amountIn,
          amount_out: tx.amountOut || null,
          fee_amount: tx.feeAmount || null,
          status: tx.status,
          tx_hash: tx.txHash,
          tx_hash_dest: tx.txHashDest || null,
          explorer_url: tx.explorerUrl || null,
          created_at: tx.createdAt,
          updated_at: tx.updatedAt,
        });
        if (error) console.warn('[Database] Insert error:', error.message);
      } catch (err) {
        console.warn('[Database] Insert error:', err);
      }
    }
    this.inMemoryTxs.set(tx.id, tx);
    return tx;
  }

  public async getTransactionsByWallet(
    walletAddress: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ data: Transaction[]; total: number }> {
    const normalizedWallet = walletAddress.toLowerCase();

    if (supabase) {
      try {
        // Get total count
        const { count, error: countError } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('wallet_address', normalizedWallet);

        if (countError) throw countError;

        // Get paginated data
        const { data: rows, error: dataError } = await supabase
          .from('transactions')
          .select('*')
          .eq('wallet_address', normalizedWallet)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (dataError) throw dataError;

        return {
          data: (rows || []).map((r: any) => rowToTransaction(r)),
          total: count || 0,
        };
      } catch (err) {
        console.warn('[Database] Fetch error:', err);
      }
    }

    // In-memory fallback
    const all = Array.from(this.inMemoryTxs.values())
      .filter(tx => tx.walletAddress.toLowerCase() === normalizedWallet)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { data: all.slice(offset, offset + limit), total: all.length };
  }

  public async getTransactionById(id: string): Promise<Transaction | undefined> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') console.warn('[Database] GetById error:', error.message);
          return this.inMemoryTxs.get(id);
        }
        if (data) return rowToTransaction(data);
      } catch (err) {
        console.warn('[Database] GetById error:', err);
      }
    }
    return this.inMemoryTxs.get(id);
  }

  public async updateTransactionStatus(
    id: string,
    status: Transaction['status'],
    txHashDest?: string,
    amountOut?: string
  ): Promise<Transaction | undefined> {
    const updatedAt = new Date().toISOString();

    if (supabase) {
      try {
        const updateFields: Record<string, any> = { status, updated_at: updatedAt };
        if (txHashDest) updateFields.tx_hash_dest = txHashDest;
        if (amountOut) updateFields.amount_out = amountOut;

        const { data, error } = await supabase
          .from('transactions')
          .update(updateFields)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.warn('[Database] Update error:', error.message);
        } else if (data) {
          const tx = rowToTransaction(data);
          this.inMemoryTxs.set(id, tx);
          return tx;
        }
      } catch (err) {
        console.warn('[Database] Update error:', err);
      }
    }

    // In-memory fallback
    const tx = this.inMemoryTxs.get(id);
    if (!tx) return undefined;

    const updated: Transaction = {
      ...tx,
      status,
      txHashDest: txHashDest ?? tx.txHashDest,
      amountOut: amountOut ?? tx.amountOut,
      updatedAt,
    };
    this.inMemoryTxs.set(id, updated);
    return updated;
  }

  /* -------- Nonces -------- */

  public async setNonce(walletAddress: string, nonce: string, ttlSeconds: number = 300): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const normalizedWallet = walletAddress.toLowerCase();

    if (supabase) {
      try {
        const { error } = await supabase.from('nonces').upsert(
          {
            wallet_address: normalizedWallet,
            nonce,
            expires_at: expiresAt,
          },
          { onConflict: 'wallet_address' }
        );
        if (error) console.warn('[Database] Nonce insert error:', error.message);
      } catch (err) {
        console.warn('[Database] Nonce insert error:', err);
      }
    }
    this.inMemoryNonces.set(normalizedWallet, { nonce, expiresAt });
  }

  public async getNonce(walletAddress: string): Promise<string | undefined> {
    const normalizedWallet = walletAddress.toLowerCase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('nonces')
          .select('nonce, expires_at')
          .eq('wallet_address', normalizedWallet)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') console.warn('[Database] Nonce get error:', error.message);
          // Fall through to in-memory
        } else if (data) {
          if (Date.now() > data.expires_at) {
            await this.clearNonce(walletAddress);
            return undefined;
          }
          return data.nonce;
        }
      } catch (err) {
        console.warn('[Database] Nonce get error:', err);
      }
    }

    const entry = this.inMemoryNonces.get(normalizedWallet);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.inMemoryNonces.delete(normalizedWallet);
      return undefined;
    }
    return entry.nonce;
  }

  public async clearNonce(walletAddress: string): Promise<void> {
    const normalizedWallet = walletAddress.toLowerCase();

    if (supabase) {
      try {
        const { error } = await supabase
          .from('nonces')
          .delete()
          .eq('wallet_address', normalizedWallet);
        if (error) console.warn('[Database] Nonce clear error:', error.message);
      } catch (err) {
        console.warn('[Database] Nonce clear error:', err);
      }
    }
    this.inMemoryNonces.delete(normalizedWallet);
  }
}

export const db = new DatabaseStore();
