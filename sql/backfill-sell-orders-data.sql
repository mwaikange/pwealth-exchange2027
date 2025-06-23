-- Backfill missing data in sell_orders table to ensure proper display
-- This ensures all sell orders have the correct calculated fields

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add shares_remaining column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sell_orders' AND column_name = 'shares_remaining'
    ) THEN
        ALTER TABLE sell_orders ADD COLUMN shares_remaining NUMERIC DEFAULT 0;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sell_orders' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE sell_orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Backfill shares_remaining for existing orders
UPDATE sell_orders 
SET shares_remaining = shares_available
WHERE shares_remaining IS NULL OR shares_remaining = 0;

-- Set updated_at for existing records
UPDATE sell_orders 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Update status for completed orders
UPDATE sell_orders 
SET status = 'completed'::order_status
WHERE shares_remaining <= 0 
  AND status != 'completed';
