-- Test the exact queries your frontend should be making

-- Test 1: Market Buy Orders (should show ALL pending buy orders)
SELECT 'TEST 1: Market Buy Orders' as test_name;
SELECT 
    id, 
    user_uuid, 
    total_amount, 
    shares_requested,
    price_per_share, 
    status, 
    created_at
FROM buy_orders
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Test 2: Market Sell Orders (should show ALL available sell orders)
SELECT 'TEST 2: Market Sell Orders' as test_name;
SELECT 
    id, 
    user_uuid, 
    shares_available, 
    shares_remaining,
    price_per_share, 
    status, 
    created_at
FROM sell_orders
WHERE status = 'available'
ORDER BY created_at DESC;

-- Test 3: Your Buy Orders (for specific user)
SELECT 'TEST 3: Your Buy Orders (user: 8cd30e69-ddaa-4a90-94e3-f65472738164)' as test_name;
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
WHERE user_uuid = '8cd30e69-ddaa-4a90-94e3-f65472738164'
ORDER BY created_at DESC;

-- Test 4: Your Sell Orders (for specific user)
SELECT 'TEST 4: Your Sell Orders (user: 8cd30e69-ddaa-4a90-94e3-f65472738164)' as test_name;
SELECT 
    id, 
    user_uuid, 
    shares_available, 
    shares_remaining,
    price_per_share, 
    status, 
    created_at
FROM sell_orders
WHERE user_uuid = '8cd30e69-ddaa-4a90-94e3-f65472738164'
ORDER BY created_at DESC;

-- Test 5: Count all orders
SELECT 'TEST 5: Order Counts' as test_name;
SELECT 
    'buy_orders' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count
FROM buy_orders
UNION ALL
SELECT 
    'sell_orders' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'available') as available_count
FROM sell_orders;
