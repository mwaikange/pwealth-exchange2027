-- Test script for the simplified price calculation system

-- 1. Check if JSE200 data exists
SELECT 
    'JSE200 Data Check' as test_name,
    COUNT(*) as record_count,
    MAX(created_at) as latest_update
FROM JSE200_PriceUpdate_Mondays;

-- 2. Show latest JSE200 data
SELECT 
    'Latest JSE200 Record' as test_name,
    price,
    percent_change,
    week_start_date,
    created_at
FROM JSE200_PriceUpdate_Mondays
ORDER BY created_at DESC
LIMIT 1;

-- 3. Check current weekly_prices data
SELECT 
    'Current Weekly Prices' as test_name,
    COUNT(*) as record_count,
    MAX(effective_date) as latest_date
FROM weekly_prices;

-- 4. Show latest weekly price record
SELECT 
    'Latest Weekly Price Record' as test_name,
    effective_date,
    base_price,
    j200_growth,
    final_price,
    price_change,
    created_at
FROM weekly_prices
ORDER BY effective_date DESC, created_at DESC
LIMIT 1;

-- 5. Test the calculation function (dry run)
SELECT 
    'Test Calculation Function' as test_name,
    calculate_weekly_share_price_simplified() as result;

-- 6. Test current price function
SELECT 
    'Current Share Price' as test_name,
    get_current_share_price() as current_price;

-- 7. Test price history function
SELECT 
    'Price History Test' as test_name,
    COUNT(*) as history_count
FROM get_price_history(30);

-- 8. Show price history sample
SELECT 
    date,
    price,
    j200_growth,
    price_change
FROM get_price_history(7)
ORDER BY date DESC;

-- 9. Check cron job status
SELECT 
    'Cron Job Status' as test_name,
    jobname,
    schedule,
    active
FROM cron.job 
WHERE jobname = 'weekly-price-calculation-simplified';
