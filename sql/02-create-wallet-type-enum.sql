-- ==============================================
-- STEP 2: CREATE WALLET_TYPE ENUM IF MISSING
-- ==============================================

-- Create wallet_type enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_type') THEN
        CREATE TYPE wallet_type AS ENUM (
            'buy_wallet',
            'hold_pre', 
            'hold_post',
            'hold_wallet_pre_hold',
            'hold_wallet_post_hold',
            'cashout_wallet'
        );
        RAISE NOTICE 'Created wallet_type enum';
    ELSE
        RAISE NOTICE 'wallet_type enum already exists';
    END IF;
END $$;

-- Check if user_shares table exists, if not create it
CREATE TABLE IF NOT EXISTS user_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_type wallet_type NOT NULL,
    shares NUMERIC(15,4) NOT NULL DEFAULT 0,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_uuid, wallet_type)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_shares_user_uuid ON user_shares(user_uuid);
CREATE INDEX IF NOT EXISTS idx_user_shares_wallet_type ON user_shares(wallet_type);

-- Enable RLS if not already enabled
ALTER TABLE user_shares ENABLE ROW LEVEL SECURITY;

-- Create RLS policy if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_shares' 
        AND policyname = 'Users can manage own shares'
    ) THEN
        CREATE POLICY "Users can manage own shares" ON user_shares
            FOR ALL USING (auth.uid() = user_uuid);
        RAISE NOTICE 'Created RLS policy for user_shares';
    ELSE
        RAISE NOTICE 'RLS policy already exists for user_shares';
    END IF;
END $$;

SELECT 'WALLET_TYPE ENUM AND USER_SHARES TABLE READY' as status;
