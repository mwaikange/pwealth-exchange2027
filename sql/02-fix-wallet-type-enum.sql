-- ==============================================
-- FIX WALLET TYPE ENUM AND RECREATE PROPERLY
-- ==============================================

BEGIN;

-- Drop existing user_shares table if it has wrong constraints
DROP TABLE IF EXISTS user_shares CASCADE;

-- Drop and recreate wallet_type enum with correct values
DROP TYPE IF EXISTS wallet_type CASCADE;

-- Create wallet_type enum with the correct values based on your system
CREATE TYPE wallet_type AS ENUM (
    'buy_wallet',
    'hold_wallet_pre_hold',
    'hold_wallet_post_hold', 
    'cashout_wallet'
);

-- Recreate user_shares table with proper structure
CREATE TABLE user_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_type wallet_type NOT NULL,
    shares NUMERIC(15,4) NOT NULL DEFAULT 0,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_uuid, wallet_type)
);

-- Create indexes
CREATE INDEX idx_user_shares_user_uuid ON user_shares(user_uuid);
CREATE INDEX idx_user_shares_wallet_type ON user_shares(wallet_type);

-- Enable RLS
ALTER TABLE user_shares ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage own shares" ON user_shares
    FOR ALL USING (auth.uid() = user_uuid);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_user_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_shares_updated_at
    BEFORE UPDATE ON user_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_user_shares_updated_at();

COMMIT;

-- Verify the enum values
SELECT 'FIXED WALLET_TYPE ENUM VALUES' as section;
SELECT 
    enumlabel as wallet_type_value,
    enumsortorder as sort_order
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'wallet_type')
ORDER BY enumsortorder;

SELECT 'WALLET_TYPE ENUM FIXED AND TABLE RECREATED' as status;
