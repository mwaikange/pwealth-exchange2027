-- Test that order placement now works
SELECT 'Testing order placement...' as info;

-- Check current buy orders
SELECT 'Current buy orders:' as info;
SELECT id, user_uuid, total_amount, shares_requested, shares_filled, status, created_at
FROM buy_orders
ORDER BY created_at DESC
LIMIT 5;

-- Check current sell orders  
SELECT 'Current sell orders:' as info;
SELECT id, user_uuid, shares_available, shares_remaining, status, created_at
FROM sell_orders
ORDER BY created_at DESC
LIMIT 5;

-- Test the functions are working
SELECT 'Functions available:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('place_buy_order', 'place_sell_order', 'match_orders')
AND routine_schema = 'public';
