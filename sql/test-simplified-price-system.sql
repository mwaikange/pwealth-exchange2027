-- Test script for the simplified price calculation system

-- 1. Check if JSE200_PriceUpdate_Mondays table exists and has data
SELECT 'JSE200 Data Check' as test_name;
SELECT 
    COUNT(*) as total_records,
    MAX(created_at) as latest_update,
    MAX(week_start_date) as latest_week
FROM JSE200_PriceUpdate_Mondays;

-- 2. Show latest JSE200 data
SELECT 'Latest JSE200 Records' as test_name;
SELECT 
    week_start_date,
    price,
    percent_change,
    created_at
FROM JSE200_PriceUpdate_Mondays
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check current weekly_prices data
SELECT 'Current Weekly Prices' as test_name;
SELECT 
    effective_date,
    base_price,
    j200_growth,
    final_price,
    price_change,
    created_at
FROM weekly_prices
ORDER BY effective_date DESC
LIMIT 5;

-- 4. Test the new calculation function
SELECT 'Testing Price Calculation Function' as test_name;
SELECT calculate_weekly_share_price_simplified() as calculation_result;

-- 5. Test current price function
SELECT 'Testing Current Price Function' as test_name;
SELECT get_current_share_price() as current_price;

-- 6. Test price history function
SELECT 'Testing Price History Function' as test_name;
SELECT * FROM get_price_history(7) LIMIT 3;

-- 7. Verify the calculation manually
SELECT 'Manual Calculation Verification' as test_name;
WITH latest_jse AS (
    SELECT percent_change, price, week_start_date
    FROM JSE200_PriceUpdate_Mondays
    ORDER BY created_at DESC
    LIMIT 1
),
last_price AS (
    SELECT final_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1
)
SELECT 
    lj.percent_change as jse200_growth,
    lj.price as jse200_price,
    lj.week_start_date,
    COALESCE(lp.final_price, 100.00) as base_price,
    COALESCE(lp.final_price, 100.00) * (1 + (lj.percent_change / 100)) as calculated_final_price,
    (COALESCE(lp.final_price, 100.00) * (1 + (lj.percent_change / 100))) - COALESCE(lp.final_price, 100.00) as calculated_change
FROM latest_jse lj
CROSS JOIN last_price lp;
