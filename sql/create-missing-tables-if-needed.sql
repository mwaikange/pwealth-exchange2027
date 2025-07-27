-- Create missing tables that might be causing fetch errors

-- 1. Ensure user_shares table exists with correct structure
CREATE TABLE IF NOT EXISTS user_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('buy_wallet', 'hold_pre', 'hold_post', 'cashout_wallet', 'vesting_locked')),
  shares NUMERIC(15,6) DEFAULT 0 NOT NULL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_uuid, wallet_type)
);

-- 2. Ensure vesting_schedules table exists
CREATE TABLE IF NOT EXISTS vesting_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id INTEGER NOT NULL,
  level TEXT NOT NULL,
  status TEXT DEFAULT 'Unclaimed' CHECK (status IN ('Unclaimed', 'Active', 'Completed', 'Claimed')),
  shares_amount NUMERIC(15,6),
  start_date TIMESTAMPTZ,
  completion_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_uuid, schedule_id)
);

-- 3. Ensure share_transactions table exists
CREATE TABLE IF NOT EXISTS share_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  shares NUMERIC(15,6) DEFAULT 0,
  price_per_share NUMERIC(10,2),
  total_amount NUMERIC(15,2),
  from_wallet TEXT,
  to_wallet TEXT,
  status TEXT DEFAULT 'completed',
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_shares_user_wallet ON user_shares(user_uuid, wallet_type);
CREATE INDEX IF NOT EXISTS idx_vesting_schedules_user ON vesting_schedules(user_uuid);
CREATE INDEX IF NOT EXISTS idx_share_transactions_user ON share_transactions(user_uuid);
