-- Test the Weekly System
-- Run this to verify everything is working

-- 1. Test trading status
SELECT is_trading_allowed();

-- 2. Check current weekly price
SELECT * FROM weekly_price ORDER BY week_start_date DESC LIMIT 5;

-- 3. Test setting weekly price manually
SELECT set_weekly_price();

-- 4. Test order matching manually
SELECT match_orders();

-- 5. Check order matching logs
SELECT * FROM order_matching_log ORDER BY created_at DESC LIMIT 10;

-- 6. Test expiring orders manually
SELECT expire_weekly_orders();

-- 7. Check current orders status
SELECT 
    'buy_orders' as table_name,
    status,
    COUNT(*) as count
FROM buy_orders 
GROUP BY status
UNION ALL
SELECT 
    'sell_orders' as table_name,
    status,
    COUNT(*) as count
FROM sell_orders 
GROUP BY status
ORDER BY table_name, status;

-- 8. Check matched orders
SELECT 
    mo.*,
    bo.price_per_share as buy_price,
    so.price_per_share as sell_price
FROM matched_orders mo
LEFT JOIN buy_orders bo ON mo.buy_order_id = bo.id
LEFT JOIN sell_orders so ON mo.sell_order_id = so.id
ORDER BY mo.matched_at DESC
LIMIT 10;
