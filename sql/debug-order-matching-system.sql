-- Debug order matching system
-- Run this to see why orders aren't being matched

-- 1. Check current orders status
SELECT 'Buy Orders' as order_type, status, count(*) as count
FROM buy_orders 
GROUP BY status
UNION ALL
SELECT 'Sell Orders' as order_type, status, count(*) as count  
FROM sell_orders
GROUP BY status;

-- 2. Check if match_orders function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'match_orders';

-- 3. Check recent buy orders
SELECT id, user_uuid, total_amount, price_per_share, shares_requested, 
       shares_filled, amount_filled, status, created_at
FROM buy_orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check recent sell orders  
SELECT id, user_uuid, shares_available, price_per_share, shares_remaining, status, created_at
FROM sell_orders
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if there are any matched_orders records
SELECT count(*) as matched_orders_count FROM matched_orders;

-- 6. Test manual order matching
SELECT 'Testing order matching...' as status;
SELECT match_orders();
