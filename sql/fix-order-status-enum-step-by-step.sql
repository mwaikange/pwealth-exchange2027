-- Step-by-step fix for order_status enum creation
-- This handles existing data properly

-- STEP 1: First, let's see what status values currently exist
SELECT 'buy_orders current status values:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM buy_orders 
GROUP BY status;

SELECT 'sell_orders current status values:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM sell_orders 
GROUP BY status;

-- STEP 2: Create the enum type (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'pending',
            'partial', 
            'filled',
            'cancelled',
            'available',
            'completed'
        );
    END IF;
END $$;

-- STEP 3: Clean up buy_orders status values first
UPDATE buy_orders SET status = 'pending' WHERE status IS NULL;
UPDATE buy_orders SET status = 'pending' WHERE status = '';
UPDATE buy_orders SET status = 'pending' WHERE status NOT IN ('pending', 'partial', 'filled', 'cancelled', 'available', 'completed');

-- STEP 4: Clean up sell_orders status values first  
UPDATE sell_orders SET status = 'available' WHERE status IS NULL;
UPDATE sell_orders SET status = 'available' WHERE status = '';
UPDATE sell_orders SET status = 'available' WHERE status NOT IN ('pending', 'partial', 'filled', 'cancelled', 'available', 'completed');

-- STEP 5: Now safely convert buy_orders status column
DO $$
BEGIN
    -- Drop default constraint first
    ALTER TABLE buy_orders ALTER COLUMN status DROP DEFAULT;
    
    -- Convert to enum type
    ALTER TABLE buy_orders ALTER COLUMN status TYPE order_status USING status::order_status;
    
    -- Add back default
    ALTER TABLE buy_orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;
END $$;

-- STEP 6: Now safely convert sell_orders status column
DO $$
BEGIN
    -- Drop default constraint first
    ALTER TABLE sell_orders ALTER COLUMN status DROP DEFAULT;
    
    -- Convert to enum type
    ALTER TABLE sell_orders ALTER COLUMN status TYPE order_status USING status::order_status;
    
    -- Add back default
    ALTER TABLE sell_orders ALTER COLUMN status SET DEFAULT 'available'::order_status;
END $$;

-- STEP 7: Verify the conversion worked
SELECT 'buy_orders after conversion:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM buy_orders 
GROUP BY status;

SELECT 'sell_orders after conversion:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM sell_orders 
GROUP BY status;
