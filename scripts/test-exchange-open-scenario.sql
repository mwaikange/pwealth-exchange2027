-- Test script to verify exchange opening scenario works correctly with UTC+2 timezone

-- Test 1: Check current timezone handling
SELECT 
    'Timezone Test' as test_name,
    NOW() as utc_time,
    (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours' as namibian_time,
    EXTRACT(ISODOW FROM (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours') as day_of_week,
    EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours') as hour_of_day;

-- Test 2: Verify exchange status function
SELECT 
    'Exchange Status Test' as test_name,
    *
FROM get_exchange_status();

-- Test 3: Test price calculation
SELECT 
    'Price Calculation Test' as test_name,
    calculate_weekly_share_price_simplified() as calculated_price,
    get_current_share_price() as current_price;

-- Test 4: Check JSE200 data availability
SELECT 
    'JSE200 Data Test' as test_name,
    COUNT(*) as total_records,
    MAX(week_start_date) as latest_week,
    MIN(week_start_date) as earliest_week
FROM jse200_weekly_data;

-- Test 5: Verify pricing info table
SELECT 
    'Pricing Info Test' as test_name,
    COUNT(*) as total_records,
    MAX(calculated_at) as latest_calculation,
    AVG(final_price) as average_price
FROM current_pricing_info;

-- Test 6: Check exchange trading hours
SELECT 
    'Trading Hours Test' as test_name,
    COUNT(*) as total_records,
    MAX(opened_at) as latest_open,
    MAX(closed_at) as latest_close,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_sessions,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_sessions
FROM exchange_trading_hours;

-- Test 7: Simulate exchange opening
DO $$
DECLARE
    result BOOLEAN;
    current_utc2 TIMESTAMP;
BEGIN
    current_utc2 := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    
    RAISE NOTICE 'Testing exchange opening at %', current_utc2;
    
    result := open_exchange_weekly();
    
    IF result THEN
        RAISE NOTICE '✅ Exchange opening test PASSED';
    ELSE
        RAISE NOTICE '❌ Exchange opening test FAILED';
    END IF;
END $$;

-- Test 8: Verify order history cleanup
SELECT 
    'Order History Test' as test_name,
    (SELECT COUNT(*) FROM buy_orders) as total_buy_orders,
    (SELECT COUNT(*) FROM sell_orders) as total_sell_orders,
    (SELECT COUNT(*) FROM buy_orders WHERE status = 'pending') as pending_buy_orders,
    (SELECT COUNT(*) FROM sell_orders WHERE status = 'pending') as pending_sell_orders;

-- Test 9: Check price history function
SELECT 
    'Price History Test' as test_name,
    *
FROM get_price_history(7)
LIMIT 5;

-- Test 10: Final verification
SELECT 
    'Final Verification' as test_name,
    CASE 
        WHEN get_current_share_price() > 0 THEN '✅ Price system working'
        ELSE '❌ Price system failed'
    END as price_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM get_exchange_status() WHERE is_open IS NOT NULL) THEN '✅ Exchange status working'
        ELSE '❌ Exchange status failed'
    END as exchange_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM current_pricing_info LIMIT 1) THEN '✅ Pricing info available'
        ELSE '❌ No pricing info'
    END as pricing_info_status;

SELECT '🎯 Exchange opening scenario test completed!' as final_status;
