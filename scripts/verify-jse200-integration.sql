-- Verification script to test the JSE200 integration

-- 1. Check if JSE200 table exists and has data
SELECT 'JSE200 Table Data:' as check_type;
SELECT week_start, update_time, price_value, created_at
FROM JSE200_PriceUpdate_Mondays
ORDER BY week_start DESC, update_time DESC
LIMIT 5;

-- 2. Test the new function
SELECT 'Testing set_weekly_price_from_jse200():' as check_type;
SELECT set_weekly_price_from_jse200();

-- 3. Check if weekly_share_prices was updated
SELECT 'Updated Weekly Share Prices:' as check_type;
SELECT week_start, peg_price, calculated_price, average_hodl_percentage, created_at
FROM weekly_share_prices
ORDER BY week_start DESC
LIMIT 3;

-- 4. Test the get_current_share_price function still works
SELECT 'Current Share Price (should work as before):' as check_type;
SELECT get_current_share_price() as current_price;

-- 5. Check current pricing info view
SELECT 'Current Pricing Info View:' as check_type;
SELECT current_price, week_start, latest_hodl_date
FROM current_pricing_info
LIMIT 1;

-- 6. Verify cron jobs are set up
SELECT 'Cron Jobs:' as check_type;
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname LIKE '%weekly-price%';
