-- Debug script to find out why buy orders aren't showing up
-- Run this to investigate the current state

-- 1. Check if buy_orders table exists and has data
SELECT 
    'buy_orders_table_check' as check_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status_count
FROM buy_orders;

-- 2. Show all buy orders with their current status
SELECT 
    id,
    user_uuid,
    total_amount,
    price_per_share,
    status,
    created_at,
    shares_requested,
    shares_filled,
    amount_filled
FROM buy_orders 
ORDER BY created_at DESC;

-- 3. Check what status values actually exist
SELECT 
    status,
    COUNT(*) as count
FROM buy_orders 
GROUP BY status;

-- 4. Check if there are any RLS policies blocking the data
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'buy_orders';

-- 5. Test a simple select that your frontend might be using
SELECT * FROM buy_orders WHERE status = 'pending' ORDER BY created_at DESC;
