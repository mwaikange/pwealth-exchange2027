-- Add missing columns to buy_orders table after enum fix

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add shares_requested column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' AND column_name = 'shares_requested'
    ) THEN
        ALTER TABLE buy_orders ADD COLUMN shares_requested NUMERIC DEFAULT 0;
    END IF;

    -- Add shares_filled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' AND column_name = 'shares_filled'
    ) THEN
        ALTER TABLE buy_orders ADD COLUMN shares_filled NUMERIC DEFAULT 0;
    END IF;

    -- Add amount_filled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' AND column_name = 'amount_filled'
    ) THEN
        ALTER TABLE buy_orders ADD COLUMN amount_filled NUMERIC DEFAULT 0;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE buy_orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Backfill calculated values
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
WHERE shares_filled IS NULL OR shares_filled = 0;

UPDATE buy_orders 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Update status based on fill amounts
UPDATE buy_orders 
SET status = 'filled'::order_status
WHERE amount_filled >= total_amount 
  AND status != 'filled'::order_status;

UPDATE buy_orders 
SET status = 'partial'::order_status
WHERE amount_filled > 0 
  AND amount_filled < total_amount 
  AND status = 'pending'::order_status;
