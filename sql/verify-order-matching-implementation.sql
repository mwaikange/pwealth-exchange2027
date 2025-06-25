-- Verify that place_buy_order function creates matched_orders entries
-- and performs correct wallet transfers

-- Check if matched_orders entries are being created
SELECT 'Recent matched_orders entries:' as info;
SELECT 
    mo.*,
    bo.status as buy_status,
    so.status as sell_status
FROM matched_orders mo
JOIN buy_orders bo ON mo.buy_order_id = bo.id  
JOIN sell_orders so ON mo.sell_order_id = so.id
ORDER BY mo.matched_at DESC
LIMIT 5;

-- Verify wallet transfer logic in place_buy_order function
SELECT 'Checking place_buy_order function for wallet transfers:' as info;
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'place_buy_order' 
AND routine_type = 'FUNCTION';

-- Check if the function includes these key operations:
-- 1. INSERT INTO matched_orders
-- 2. UPDATE user_shares for hold_pre (buyer)  
-- 3. UPDATE user_shares for cashout_wallet (seller)
-- 4. INSERT INTO share_transactions for both parties

-- Test query to see current wallet balances
SELECT 'Sample wallet balances:' as info;
SELECT 
    user_uuid,
    wallet_type,
    shares,
    updated_at
FROM user_shares 
WHERE wallet_type IN ('hold_pre', 'cashout_wallet')
ORDER BY updated_at DESC
LIMIT 10;
