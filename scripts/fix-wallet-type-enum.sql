-- Fix wallet_type enum values in the database
-- The correct values are: buy_wallet, hold_wallet_pre_hold, hold_wallet_post_hold, cashout_wallet

-- First, let's check the current enum values
DO $$
DECLARE
  enum_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'wallet_type'
  ) INTO enum_exists;
  
  IF enum_exists THEN
    RAISE NOTICE 'wallet_type enum exists, checking values...';
  ELSE
    RAISE NOTICE 'wallet_type enum does not exist, creating it...';
  END IF;
END $$;

-- Drop and recreate the enum with correct values
-- First, we need to handle the existing column

-- Step 1: Create a new enum with correct values if it doesn't exist
DO $$
BEGIN
  -- Check if enum already has correct values
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'wallet_type'::regtype 
    AND enumlabel = 'hold_wallet_pre_hold'
  ) THEN
    -- Drop the old enum and create new one
    -- First, change the column to text temporarily
    ALTER TABLE user_shares ALTER COLUMN wallet_type TYPE TEXT;
    
    -- Drop the old enum type
    DROP TYPE IF EXISTS wallet_type CASCADE;
    
    -- Create new enum with correct values
    CREATE TYPE wallet_type AS ENUM (
      'buy_wallet',
      'hold_wallet_pre_hold', 
      'hold_wallet_post_hold',
      'cashout_wallet'
    );
    
    -- Update any existing incorrect values
    UPDATE user_shares SET wallet_type = 'hold_wallet_pre_hold' WHERE wallet_type = 'hold_pre';
    UPDATE user_shares SET wallet_type = 'hold_wallet_post_hold' WHERE wallet_type = 'hold_post';
    
    -- Convert column back to enum type
    ALTER TABLE user_shares ALTER COLUMN wallet_type TYPE wallet_type USING wallet_type::wallet_type;
    
    RAISE NOTICE 'wallet_type enum recreated with correct values';
  ELSE
    RAISE NOTICE 'wallet_type enum already has correct values';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error handling enum: %, attempting alternative approach...', SQLERRM;
END $$;

-- Alternative approach: Add missing values if enum exists but is missing values
DO $$
BEGIN
  -- Try to add 'hold_wallet_pre_hold' if it doesn't exist
  BEGIN
    ALTER TYPE wallet_type ADD VALUE IF NOT EXISTS 'hold_wallet_pre_hold';
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists
  END;
  
  BEGIN
    ALTER TYPE wallet_type ADD VALUE IF NOT EXISTS 'hold_wallet_post_hold';
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists
  END;
  
  BEGIN
    ALTER TYPE wallet_type ADD VALUE IF NOT EXISTS 'buy_wallet';
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists
  END;
  
  BEGIN
    ALTER TYPE wallet_type ADD VALUE IF NOT EXISTS 'cashout_wallet';
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists
  END;
END $$;

-- Update the match_orders function to use correct wallet types
CREATE OR REPLACE FUNCTION match_orders()
RETURNS void AS $$
DECLARE
  buy_rec RECORD;
  sell_rec RECORD;
  matched_shares NUMERIC;
  matched_amount NUMERIC;
BEGIN
  -- Loop through all pending/open buy orders
  FOR buy_rec IN
    SELECT * FROM buy_orders
    WHERE status IN ('pending', 'open', 'partial')
    ORDER BY created_at ASC
  LOOP
    -- Find matching sell orders
    FOR sell_rec IN
      SELECT * FROM sell_orders
      WHERE status IN ('pending', 'open', 'partial')
        AND price_per_share <= buy_rec.price_per_share
      ORDER BY price_per_share ASC, created_at ASC
    LOOP
      -- Calculate shares to match
      matched_shares := LEAST(
        buy_rec.shares_requested - COALESCE(buy_rec.shares_filled, 0),
        sell_rec.shares_available - COALESCE(sell_rec.shares_remaining, sell_rec.shares_available) + sell_rec.shares_available
      );
      
      IF matched_shares <= 0 THEN
        CONTINUE;
      END IF;
      
      matched_amount := matched_shares * sell_rec.price_per_share;
      
      -- Update buy order
      UPDATE buy_orders
      SET shares_filled = COALESCE(shares_filled, 0) + matched_shares,
          amount_filled = COALESCE(amount_filled, 0) + matched_amount,
          status = CASE 
            WHEN COALESCE(shares_filled, 0) + matched_shares >= shares_requested THEN 'filled'::order_status
            ELSE 'partial'::order_status
          END,
          updated_at = NOW()
      WHERE id = buy_rec.id;
      
      -- Update sell order
      UPDATE sell_orders
      SET shares_remaining = COALESCE(shares_remaining, shares_available) - matched_shares,
          status = CASE 
            WHEN COALESCE(shares_remaining, shares_available) - matched_shares <= 0 THEN 'filled'::order_status
            ELSE 'partial'::order_status
          END,
          updated_at = NOW()
      WHERE id = sell_rec.id;
      
      -- Transfer shares to buyer (CORRECT wallet type: hold_wallet_pre_hold)
      INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
      VALUES (buy_rec.user_uuid, 'hold_wallet_pre_hold', matched_shares, 'purchase', NOW(), NOW())
      ON CONFLICT (user_uuid, wallet_type)
      DO UPDATE SET
        shares = user_shares.shares + matched_shares,
        updated_at = NOW();
      
      -- Transfer money to seller (cashout_wallet)
      INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
      VALUES (sell_rec.user_uuid, 'cashout_wallet', matched_amount, 'sale', NOW(), NOW())
      ON CONFLICT (user_uuid, wallet_type)
      DO UPDATE SET
        shares = user_shares.shares + matched_amount,
        updated_at = NOW();
      
      -- Record matched order
      INSERT INTO matched_orders (
        buy_order_id, sell_order_id, buyer_uuid, seller_uuid,
        shares_matched, price_per_share, total_amount, matched_at
      ) VALUES (
        buy_rec.id, sell_rec.id, buy_rec.user_uuid, sell_rec.user_uuid,
        matched_shares, sell_rec.price_per_share, matched_amount, NOW()
      );
      
      -- Record transactions
      INSERT INTO share_transactions (
        user_uuid, transaction_type, shares, price_per_share, total_amount,
        to_wallet, status, description, reference_id, created_at
      ) VALUES
      (buy_rec.user_uuid, 'buy', matched_shares, sell_rec.price_per_share, matched_amount,
        'hold_wallet_pre_hold', 'completed', 'Share purchase - matched order', 'MATCH-' || buy_rec.id, NOW()),
      (sell_rec.user_uuid, 'sell', matched_shares, sell_rec.price_per_share, matched_amount,
        'cashout_wallet', 'completed', 'Share sale - matched order', 'MATCH-' || sell_rec.id, NOW());
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update any existing data with incorrect wallet types
UPDATE user_shares SET wallet_type = 'hold_wallet_pre_hold'::wallet_type WHERE wallet_type::text = 'hold_pre';
UPDATE user_shares SET wallet_type = 'hold_wallet_post_hold'::wallet_type WHERE wallet_type::text = 'hold_post';

-- Verify the fix
SELECT 
  wallet_type,
  COUNT(*) as count
FROM user_shares
GROUP BY wallet_type;

-- Show enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'wallet_type'::regtype
ORDER BY enumsortorder;
