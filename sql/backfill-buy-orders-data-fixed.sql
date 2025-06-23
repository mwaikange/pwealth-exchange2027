-- Fixed backfill script without enum casting errors
-- Run this AFTER creating the order_status enum

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

-- Backfill shares_requested for existing orders where it's NULL or 0
UPDATE buy_orders 
SET shares_requested = CASE 
    WHEN price_per_share > 0 THEN total_amount / price_per_share 
    ELSE 0 
END
WHERE shares_requested IS NULL OR shares_requested = 0;

-- Backfill shares_filled based on amount_filled and price_per_share
UPDATE buy_orders 
SET shares_filled = CASE 
    WHEN price_per_share > 0 AND amount_filled > 0 THEN amount_filled / price_per_share 
    ELSE 0 
END
WHERE shares_filled IS NULL OR shares_filled = 0;

-- Set updated_at for existing records
UPDATE buy_orders 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Update status for orders that should be marked as filled (now using proper enum)
UPDATE buy_orders 
SET status = 'filled'
WHERE amount_filled >= total_amount 
  AND status != 'filled';

-- Update status for orders that should be marked as partial
UPDATE buy_orders 
SET status = 'partial'
WHERE amount_filled > 0 
  AND amount_filled < total_amount 
  AND status = 'pending';
