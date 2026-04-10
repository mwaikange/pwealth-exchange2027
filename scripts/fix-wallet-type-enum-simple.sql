-- Simple fix for wallet_type enum values
-- Add missing enum values without recreating functions

-- Add missing enum values (these commands are safe to run multiple times)
DO $$
BEGIN
  -- Try to add 'hold_wallet_pre_hold' if it doesn't exist
  BEGIN
    ALTER TYPE wallet_type ADD VALUE IF NOT EXISTS 'hold_wallet_pre_hold';
    RAISE NOTICE 'Added hold_wallet_pre_hold to wallet_type enum';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'hold_wallet_pre_hold already exists';
  WHEN invalid_parameter_value THEN
    RAISE NOTICE 'hold_wallet_pre_hold already exists (invalid_parameter_value)';
  END;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER TYPE wallet_type ADD VALUE IF NOT EXISTS 'hold_wallet_post_hold';
    RAISE NOTICE 'Added hold_wallet_post_hold to wallet_type enum';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'hold_wallet_post_hold already exists';
  WHEN invalid_parameter_value THEN
    RAISE NOTICE 'hold_wallet_post_hold already exists (invalid_parameter_value)';
  END;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER TYPE wallet_type ADD VALUE IF NOT EXISTS 'buy_wallet';
    RAISE NOTICE 'Added buy_wallet to wallet_type enum';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'buy_wallet already exists';
  WHEN invalid_parameter_value THEN
    RAISE NOTICE 'buy_wallet already exists (invalid_parameter_value)';
  END;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER TYPE wallet_type ADD VALUE IF NOT EXISTS 'cashout_wallet';
    RAISE NOTICE 'Added cashout_wallet to wallet_type enum';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'cashout_wallet already exists';
  WHEN invalid_parameter_value THEN
    RAISE NOTICE 'cashout_wallet already exists (invalid_parameter_value)';
  END;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER TYPE wallet_type ADD VALUE IF NOT EXISTS 'vesting_locked';
    RAISE NOTICE 'Added vesting_locked to wallet_type enum';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'vesting_locked already exists';
  WHEN invalid_parameter_value THEN
    RAISE NOTICE 'vesting_locked already exists (invalid_parameter_value)';
  END;
END $$;

-- Verify the enum values
SELECT enumlabel as wallet_type_values
FROM pg_enum 
WHERE enumtypid = 'wallet_type'::regtype
ORDER BY enumsortorder;
