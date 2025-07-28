-- Test script for exchange weekly cycle
-- Run this to test the complete weekly exchange cycle

-- 1. Check current exchange status
SELECT 'Current Exchange Status:' as step;
SELECT get_exchange_status();

-- 2. Check current cron jobs
SELECT 'Cron Job Status:' as step;
SELECT get_cron_job_status();

-- 3. Create some test orders first (optional)
SELECT 'Creating test orders...' as step;

-- Insert test buy order (you can modify user_uuid to match a real user)
INSERT INTO buy_orders (user_uuid, total_amount, price_per_share, status, amount_filled)
VALUES (
    (SELECT id FROM auth.users LIMIT 1), -- Use first available user
    1000.00,
    108.20,
    'pending',
    0
) ON CONFLICT DO NOTHING;

-- Insert test sell order
INSERT INTO sell_orders (user_uuid, shares_available, shares_remaining, price_per_share, status, expires_at)
VALUES (
    (SELECT id FROM auth.users LIMIT 1), -- Use first available user
    10.0000,
    10.0000,
    108.20,
    'available',
    NOW() + INTERVAL '7 days'
) ON CONFLICT DO NOTHING;

-- 4. Test the complete weekly cycle
SELECT 'Testing complete weekly cycle...' as step;
SELECT trigger_weekly_cycle_test();

-- 5. Check final exchange status
SELECT 'Final Exchange Status:' as step;
SELECT get_exchange_status();

-- 6. Check if orders were cleared
SELECT 'Remaining Active Orders:' as step;
SELECT 
    'Buy Orders' as order_type,
    COUNT(*) as count,
    array_agg(status) as statuses
FROM buy_orders
WHERE status IN ('pending', 'partial')
UNION ALL
SELECT 
    'Sell Orders' as order_type,
    COUNT(*) as count,
    array_agg(status) as statuses
FROM sell_orders
WHERE status IN ('available', 'partial');

-- 7. Check current share price
SELECT 'Current Share Price:' as step;
SELECT get_current_share_price() as current_price;

-- 8. Check latest weekly price entry
SELECT 'Latest Weekly Price Entry:' as step;
SELECT * FROM weekly_prices ORDER BY effective_date DESC LIMIT 1;
