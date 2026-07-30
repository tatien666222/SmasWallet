-- 1. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('send', 'bridge', 'swap')),
  source_chain TEXT NOT NULL,
  dest_chain TEXT,
  token_in TEXT NOT NULL,
  token_out TEXT,
  amount_in TEXT NOT NULL,
  amount_out TEXT,
  fee_amount TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')),
  tx_hash TEXT NOT NULL,
  tx_hash_dest TEXT,
  explorer_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tx_wallet ON transactions(wallet_address);

-- 2. Nonces table (for wallet authentication)
CREATE TABLE IF NOT EXISTS nonces (
  wallet_address TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);

-- 3. Enable RLS and give Service Role access
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on nonces" ON nonces FOR ALL USING (true) WITH CHECK (true);
