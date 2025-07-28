-- Test script for exchange weekly cycle
-- Run this to test the complete weekly exchange cycle

-- 1. Check current exchange status
SELECT 'Current Exchange Status:' as step;
SELECT get_exchange_status();

-- 2. Check current cron jobs
SELECT 'Cron Job Status:' as step;
SELECT get_cron_job_status();

-- 3. Create some test orders first using the provided user UUIDs
SELECT 'Creating test orders...' as step;

-- Insert test buy order using the first provided user UUID
INSERT INTO buy_orders (user_uuid, total_amount, price_per_share, status, amount_filled)
VALUES (
    '021337f1-f594-4f2f-812d-aa4daa88318e',
    1000.00,
    108.20,
    'pending',
    0
) ON CONFLICT DO NOTHING;

-- Insert test sell order using the second provided user UUID
INSERT INTO sell_orders (user_uuid, shares_available, shares_remaining, price_per_share, status, expires_at)
VALUES (
    '8cd30e69-ddaa-4a90-94e3-f65472738164',
    10.0000,
    10.0000,
    108.20,
    'available',
    NOW() + INTERVAL '7 days'
) ON CONFLICT DO NOTHING;

-- Show created test orders
SELECT 'Test Orders Created:' as step;
SELECT 'Buy Orders' as type, COUNT(*) as count FROM buy_orders WHERE status = 'pending'
UNION ALL
SELECT 'Sell Orders' as type, COUNT(*) as count FROM sell_orders WHERE status = 'available';

-- 4. Test the complete weekly cycle
SELECT 'Testing complete weekly cycle...' as step;
SELECT trigger_weekly_cycle_test();

-- 5. Check final exchange status
SELECT 'Final Exchange Status:' as step;
SELECT get_exchange_status();

-- 6. Check if orders were cleared
SELECT 'Remaining Active Orders After Cycle:' as step;
SELECT 
    'Buy Orders' as order_type,
    COUNT(*) as count,
    array_agg(DISTINCT status) as statuses
FROM buy_orders
WHERE status IN ('pending', 'partial')
UNION ALL
SELECT 
    'Sell Orders' as order_type,
    COUNT(*) as count,
    array_agg(DISTINCT status) as statuses
FROM sell_orders
WHERE status IN ('available', 'partial');

-- 7. Check current share price
SELECT 'Current Share Price:' as step;
SELECT get_current_share_price() as current_price;

-- 8. Check latest weekly price entry
SELECT 'Latest Weekly Price Entry:' as step;
SELECT * FROM weekly_prices ORDER BY effective_date DESC LIMIT 1;

-- 9. Test individual functions
SELECT 'Testing Individual Functions:' as step;

-- Test exchange close
SELECT 'Testing close_exchange_weekly():' as test;
SELECT close_exchange_weekly();

-- Test exchange open  
SELECT 'Testing open_exchange_weekly():' as test;
SELECT open_exchange_weekly();

-- Test history clear
SELECT 'Testing clear_weekly_order_history():' as test;
SELECT clear_weekly_order_history();

-- Final status check
SELECT 'Final Status Check:' as step;
SELECT get_exchange_status();
