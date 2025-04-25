-- Create a table to track payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  user_uuid UUID REFERENCES auth.users(id),
  amount_usd DECIMAL(10, 2) NOT NULL,
  encrypted_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated',
  txid_in TEXT,
  txid_out TEXT,
  value_coin DECIMAL(10, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Enforce status values
  CONSTRAINT valid_status CHECK (status IN ('initiated', 'completed', 'failed'))
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_uuid ON payment_transactions(user_uuid);
