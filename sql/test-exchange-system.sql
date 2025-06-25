-- Test scripts for the exchange system
-- Run these to test the order matching functionality

-- Test 1: Check current system state
SELECT 'Current System State' as test_name;
SELECT * FROM exchange_statistics;
SELECT * FROM current_pricing_info;

-- Test 2: Check user balances before testing
SELECT 'User Balances Before Test' as test_name;
SELECT * FROM user_wallet_summary LIMIT 5;

-- Test 3: Test placing a sell order
SELECT 'Testing Sell Order Placement' as test_name;
-- Replace 'your-user-uuid' with an actual user UUID from your system
-- SELECT place_sell_order('your-user-uuid', 10);

-- Test 4: Check active sell orders
SELECT 'Active Sell Orders' as test_name;
SELECT * FROM active_sell_orders;

-- Test 5: Test placing a buy order
SELECT 'Testing Buy Order Placement' as test_name;
-- Replace 'your-user-uuid' with an actual user UUID from your system
-- SELECT place_buy_order('your-user-uuid', 1000);

-- Test 6: Check recent matches
SELECT 'Recent Matches' as test_name;
SELECT * FROM recent_matches LIMIT 10;

-- Test 7: Check order history
SELECT 'Order History' as test_name;
SELECT * FROM user_order_history LIMIT 10;

-- Test 8: Test expiring old orders
SELECT 'Testing Order Expiration' as test_name;
SELECT expire_old_sell_orders();

-- Test 9: Final system state
SELECT 'Final System State' as test_name;
SELECT * FROM exchange_statistics;

-- Helper: Get a sample user UUID for testing
SELECT 'Sample User UUIDs for Testing' as test_name;
SELECT id as user_uuid, email FROM auth.users LIMIT 3;
