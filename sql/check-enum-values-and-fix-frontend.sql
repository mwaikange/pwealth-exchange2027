-- 1. Check what enum values are actually defined
SELECT 'order_status enum values:' as info;
SELECT unnest(enum_range(NULL::order_status)) as enum_value;

-- 2. Check if we need to add missing enum values that the frontend expects
-- Based on the error, frontend is looking for: pending, partial, completed, filled, available

-- Add missing enum values if they don't exist
DO $$
BEGIN
    -- For buy_orders: pending, partial, completed, filled, cancelled
    BEGIN
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'partial';
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Value already exists
    END;
    
    BEGIN
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'filled';
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'matched';
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'expired';
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- 3. Verify all expected enum values now exist
SELECT 'Updated order_status enum values:' as info;
SELECT unnest(enum_range(NULL::order_status)) as enum_value;

-- 4. Create a dummy refresh_views function to stop cron errors
CREATE OR REPLACE FUNCTION refresh_views()
RETURNS void AS $$
BEGIN
  -- No-op placeholder to prevent cron errors
  RAISE NOTICE 'refresh_views() called - placeholder function';
END;
$$ LANGUAGE plpgsql;

-- 5. Show current status values in tables to verify data consistency
SELECT 'Current buy_orders status values:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM buy_orders 
GROUP BY status;

SELECT 'Current sell_orders status values:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM sell_orders 
GROUP BY status;
