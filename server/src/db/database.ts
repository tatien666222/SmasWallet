import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { Transaction } from '../types/index.js';

const dbPath = process.env.DATABASE_PATH || './data/arc-wallet.db';

// Ensure data folder exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let sqliteDb: any = null;
try {
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');

  // Initialize tables
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      type TEXT NOT NULL,
      source_chain TEXT NOT NULL,
      dest_chain TEXT,
      token_in TEXT NOT NULL,
      token_out TEXT,
      amount_in TEXT NOT NULL,
      amount_out TEXT,
      status TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      tx_hash_dest TEXT,
      explorer_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tx_wallet ON transactions(wallet_address);

    CREATE TABLE IF NOT EXISTS nonces (
      wallet_address TEXT PRIMARY KEY,
      nonce TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);
  console.log(`[Database] SQLite database initialized successfully at ${dbPath}`);
} catch (err) {
  console.warn('[Database] SQLite initialization warning:', err);
}

class DatabaseStore {
  private inMemoryTxs: Map<string, Transaction> = new Map();
  private inMemoryNonces: Map<string, { nonce: string; expiresAt: number }> = new Map();

  public insertTransaction(tx: Transaction): Transaction {
    if (sqliteDb) {
      try {
        const stmt = sqliteDb.prepare(`
          INSERT INTO transactions (
            id, wallet_address, type, source_chain, dest_chain,
            token_in, token_out, amount_in, amount_out, status,
            tx_hash, tx_hash_dest, explorer_url, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          tx.id,
          tx.walletAddress.toLowerCase(),
          tx.type,
          tx.sourceChain,
          tx.destChain || null,
          tx.tokenIn,
          tx.tokenOut || null,
          tx.amountIn,
          tx.amountOut || null,
          tx.status,
          tx.txHash,
          tx.txHashDest || null,
          tx.explorerUrl || null,
          tx.createdAt,
          tx.updatedAt
        );
      } catch (err) {
        console.warn('[Database] Insert error:', err);
      }
    }
    this.inMemoryTxs.set(tx.id, tx);
    return tx;
  }

  public getTransactionsByWallet(
    walletAddress: string,
    limit: number = 20,
    offset: number = 0
  ): { data: Transaction[]; total: number } {
    const normalizedWallet = walletAddress.toLowerCase();
    if (sqliteDb) {
      try {
        const countStmt = sqliteDb.prepare('SELECT COUNT(*) as total FROM transactions WHERE wallet_address = ?');
        const countRow = countStmt.get(normalizedWallet);
        const total = countRow?.total || 0;

        const dataStmt = sqliteDb.prepare(`
          SELECT * FROM transactions
          WHERE wallet_address = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `);
        const rows = dataStmt.all(normalizedWallet, limit, offset);

        const data: Transaction[] = rows.map((r: any) => ({
          id: r.id,
          walletAddress: r.wallet_address,
          type: r.type,
          sourceChain: r.source_chain,
          destChain: r.dest_chain,
          tokenIn: r.token_in,
          tokenOut: r.token_out,
          amountIn: r.amount_in,
          amountOut: r.amount_out,
          status: r.status,
          txHash: r.tx_hash,
          txHashDest: r.tx_hash_dest,
          explorerUrl: r.explorer_url,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
        return { data, total };
      } catch (err) {
        console.warn('[Database] Fetch error:', err);
      }
    }

    const all = Array.from(this.inMemoryTxs.values())
      .filter(tx => tx.walletAddress.toLowerCase() === normalizedWallet)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = all.length;
    const data = all.slice(offset, offset + limit);
    return { data, total };
  }

  public getTransactionById(id: string): Transaction | undefined {
    if (sqliteDb) {
      try {
        const stmt = sqliteDb.prepare('SELECT * FROM transactions WHERE id = ?');
        const r = stmt.get(id);
        if (r) {
          return {
            id: r.id,
            walletAddress: r.wallet_address,
            type: r.type,
            sourceChain: r.source_chain,
            destChain: r.dest_chain,
            tokenIn: r.token_in,
            tokenOut: r.token_out,
            amountIn: r.amount_in,
            amountOut: r.amount_out,
            status: r.status,
            txHash: r.tx_hash,
            txHashDest: r.tx_hash_dest,
            explorerUrl: r.explorer_url,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        }
      } catch (err) {
        console.warn('[Database] GetById error:', err);
      }
    }
    return this.inMemoryTxs.get(id);
  }

  public updateTransactionStatus(
    id: string,
    status: Transaction['status'],
    txHashDest?: string,
    amountOut?: string
  ): Transaction | undefined {
    const updatedAt = new Date().toISOString();
    if (sqliteDb) {
      try {
        const stmt = sqliteDb.prepare(`
          UPDATE transactions
          SET status = ?, tx_hash_dest = COALESCE(?, tx_hash_dest), amount_out = COALESCE(?, amount_out), updated_at = ?
          WHERE id = ?
        `);
        stmt.run(status, txHashDest || null, amountOut || null, updatedAt, id);
      } catch (err) {
        console.warn('[Database] Update error:', err);
      }
    }

    const tx = this.getTransactionById(id);
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

  public setNonce(walletAddress: string, nonce: string, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    if (sqliteDb) {
      try {
        const stmt = sqliteDb.prepare(`
          INSERT INTO nonces (wallet_address, nonce, expires_at)
          VALUES (?, ?, ?)
          ON CONFLICT(wallet_address) DO UPDATE SET nonce = excluded.nonce, expires_at = excluded.expires_at
        `);
        stmt.run(walletAddress.toLowerCase(), nonce, expiresAt);
      } catch (err) {
        console.warn('[Database] Nonce insert error:', err);
      }
    }
    this.inMemoryNonces.set(walletAddress.toLowerCase(), { nonce, expiresAt });
  }

  public getNonce(walletAddress: string): string | undefined {
    if (sqliteDb) {
      try {
        const stmt = sqliteDb.prepare('SELECT nonce, expires_at FROM nonces WHERE wallet_address = ?');
        const row = stmt.get(walletAddress.toLowerCase());
        if (row) {
          if (Date.now() > row.expires_at) {
            this.clearNonce(walletAddress);
            return undefined;
          }
          return row.nonce;
        }
      } catch (err) {
        console.warn('[Database] Nonce get error:', err);
      }
    }
    const entry = this.inMemoryNonces.get(walletAddress.toLowerCase());
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.inMemoryNonces.delete(walletAddress.toLowerCase());
      return undefined;
    }
    return entry.nonce;
  }

  public clearNonce(walletAddress: string): void {
    if (sqliteDb) {
      try {
        const stmt = sqliteDb.prepare('DELETE FROM nonces WHERE wallet_address = ?');
        stmt.run(walletAddress.toLowerCase());
      } catch (err) {
        console.warn('[Database] Nonce clear error:', err);
      }
    }
    this.inMemoryNonces.delete(walletAddress.toLowerCase());
  }
}

export const db = new DatabaseStore();
