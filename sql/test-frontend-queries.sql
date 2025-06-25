-- Test the exact queries your frontend is making

-- Test 1: Global market buy orders (should show ALL buy orders)
SELECT 'TEST 1: Global market buy orders' as test_name;
SELECT id, user_uuid, total_amount, price_per_share, status, created_at
FROM buy_orders
WHERE status IN ('pending', 'partial', 'filled')
ORDER BY created_at DESC;

-- Test 2: Global market sell orders (should show ALL sell orders)  
SELECT 'TEST 2: Global market sell orders' as test_name;
SELECT id, user_uuid, shares_available, price_per_share, status, created_at
FROM sell_orders
WHERE status IN ('available', 'partial')
ORDER BY created_at DESC;

-- Test 3: User-specific buy orders (replace with actual user UUID)
SELECT 'TEST 3: User-specific buy orders for user 8cd30e69-ddaa-4a90-94e3-f65472738164' as test_name;
SELECT id, user_uuid, total_amount, price_per_share, status, created_at
FROM buy_orders
WHERE user_uuid = '8cd30e69-ddaa-4a90-94e3-f65472738164'
  AND status IN ('pending', 'partial', 'completed', 'filled')
ORDER BY created_at DESC;

-- Test 4: User-specific sell orders (replace with actual user UUID)
SELECT 'TEST 4: User-specific sell orders for user 8cd30e69-ddaa-4a90-94e3-f65472738164' as test_name;
SELECT id, user_uuid, shares_available, price_per_share, status, created_at
FROM sell_orders
WHERE user_uuid = '8cd30e69-ddaa-4a90-94e3-f65472738164'
  AND status IN ('available', 'partial', 'completed')
ORDER BY created_at DESC;

-- Test 5: Check if we can access with service role
SELECT 'TEST 5: Current database role and permissions' as test_name;
SELECT current_user, current_setting('role'), session_user;
