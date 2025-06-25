-- Test Complete Weekly Trading System
-- Run this to verify everything works

-- 1. Test trading status function
SELECT '=== TESTING TRADING STATUS ===' as test_section;
SELECT is_trading_allowed();

-- 2. Test weekly price setting
SELECT '=== TESTING WEEKLY PRICE SETTING ===' as test_section;
SELECT set_weekly_price();

-- 3. Test order matching (should work even with no orders)
SELECT '=== TESTING ORDER MATCHING ===' as test_section;
SELECT match_orders();

-- 4. Test order expiration
SELECT '=== TESTING ORDER EXPIRATION ===' as test_section;
SELECT expire_weekly_orders();

-- 5. Test the new order matching function used by cron
SELECT '=== TESTING CRON ORDER MATCHING FUNCTION ===' as test_section;
SELECT run_order_matching();

-- 6. Check current system status
SELECT '=== CURRENT SYSTEM STATUS ===' as test_section;
SELECT 
    json_build_object(
        'current_time', NOW(),
        'current_day', EXTRACT(DOW FROM NOW()),
        'current_hour', EXTRACT(HOUR FROM NOW()),
        'trading_allowed', (SELECT is_trading_allowed()->>'trading_allowed')::BOOLEAN,
        'weekly_price_set', (SELECT price FROM weekly_price WHERE week_start_date = date_trunc('week', CURRENT_DATE)::DATE) IS NOT NULL,
        'active_cron_jobs', (SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%weekly%' OR jobname LIKE '%match%' OR jobname = 'cleanup-matching-logs')
    ) as system_status;

-- 7. Show weekly trading schedule
SELECT '=== WEEKLY TRADING SCHEDULE ===' as test_section;
SELECT 
    json_build_object(
        'trading_open', 'Monday 09:10 - Sunday 23:59 (Windhoek time)',
        'trading_closed', 'Sunday 23:59 - Monday 09:10 (Windhoek time)',
        'price_update', 'Monday 09:00 (Windhoek time)',
        'order_expiration', 'Sunday 23:59 (Windhoek time)',
        'matching_frequency', 'Every 2 minutes during trading hours',
        'timezone', 'Africa/Windhoek (UTC+2)'
    ) as schedule;

SELECT '=== ALL TESTS COMPLETE ===' as test_section;
