-- Ensure buy_orders table has all the columns your frontend expects
-- Based on your interface: shares_requested, shares_filled, amount_filled

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add shares_requested column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' AND column_name = 'shares_requested'
    ) THEN
        ALTER TABLE buy_orders ADD COLUMN shares_requested NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added shares_requested column';
    END IF;

    -- Add shares_filled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' AND column_name = 'shares_filled'
    ) THEN
        ALTER TABLE buy_orders ADD COLUMN shares_filled NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added shares_filled column';
    END IF;

    -- Add amount_filled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' AND column_name = 'amount_filled'
    ) THEN
        ALTER TABLE buy_orders ADD COLUMN amount_filled NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added amount_filled column';
    END IF;
END $$;

-- Backfill the missing data for existing orders
UPDATE buy_orders 
SET shares_requested = CASE 
    WHEN price_per_share > 0 THEN total_amount / price_per_share 
    ELSE 0 
END
WHERE shares_requested IS NULL OR shares_requested = 0;

UPDATE buy_orders 
SET shares_filled = CASE 
    WHEN price_per_share > 0 AND amount_filled > 0 THEN amount_filled / price_per_share 
    ELSE 0 
END
WHERE (shares_filled IS NULL OR shares_filled = 0) AND amount_filled > 0;

-- Show the updated structure
SELECT 'BUY_ORDERS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'buy_orders'
ORDER BY ordinal_position;

-- Show current data
SELECT 'CURRENT BUY_ORDERS DATA:' as info;
SELECT 
    id,
    user_uuid,
    total_amount,
    shares_requested,
    shares_filled,
    amount_filled,
    price_per_share,
    status,
    created_at
FROM buy_orders 
ORDER BY created_at DESC;
