-- Create the missing order_status enum type
-- This is required for both buy_orders and sell_orders tables

-- First, check what status values currently exist in your tables
SELECT DISTINCT status FROM buy_orders WHERE status IS NOT NULL;
SELECT DISTINCT status FROM sell_orders WHERE status IS NOT NULL;

-- Create the order_status enum type
CREATE TYPE order_status AS ENUM (
    'pending',
    'partial', 
    'filled',
    'cancelled',
    'available',
    'completed'
);

-- Update buy_orders table to use the enum (if column exists)
DO $$
BEGIN
    -- Check if status column exists and update its type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' AND column_name = 'status'
    ) THEN
        -- First, ensure all status values are valid
        UPDATE buy_orders SET status = 'pending' WHERE status IS NULL OR status = '';
        UPDATE buy_orders SET status = 'pending' WHERE status NOT IN ('pending', 'partial', 'filled', 'cancelled');
        
        -- Change column type to use enum
        ALTER TABLE buy_orders ALTER COLUMN status TYPE order_status USING status::order_status;
    ELSE
        -- Add status column if it doesn't exist
        ALTER TABLE buy_orders ADD COLUMN status order_status DEFAULT 'pending';
    END IF;
END $$;

-- Update sell_orders table to use the enum (if column exists)
DO $$
BEGIN
    -- Check if status column exists and update its type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sell_orders' AND column_name = 'status'
    ) THEN
        -- First, ensure all status values are valid
        UPDATE sell_orders SET status = 'available' WHERE status IS NULL OR status = '';
        UPDATE sell_orders SET status = 'available' WHERE status NOT IN ('available', 'partial', 'completed', 'cancelled');
        
        -- Change column type to use enum
        ALTER TABLE sell_orders ALTER COLUMN status TYPE order_status USING status::order_status;
    ELSE
        -- Add status column if it doesn't exist
        ALTER TABLE sell_orders ADD COLUMN status order_status DEFAULT 'available';
    END IF;
END $$;
