-- Test script for the simplified price calculation system

-- 1. Check if we have JSE200 data
SELECT 'JSE200 Data Check' as test_name;
SELECT 
  id,
  week_start_date,
  price,
  percent_change,
  created_at
FROM JSE200_PriceUpdate_Mondays
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check current weekly_prices data
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

-- 3. Test the price calculation function
SELECT 'Testing Price Calculation Function' as test_name;
SELECT * FROM trigger_weekly_price_calculation();

-- 4. Check the result after calculation
SELECT 'Weekly Prices After Calculation' as test_name;
SELECT 
  effective_date,
  base_price,
  j200_growth,
  final_price,
  price_change,
  created_at
FROM weekly_prices
ORDER BY effective_date DESC
LIMIT 3;

-- 5. Test get_current_share_price function
SELECT 'Current Share Price Function' as test_name;
SELECT get_current_share_price() as current_price;

-- 6. Test get_price_history function
SELECT 'Price History Function' as test_name;
SELECT * FROM get_price_history(5);

-- 7. Check cron job status
SELECT 'Cron Job Status' as test_name;
SELECT 
  jobname,
  schedule,
  command,
  active
FROM cron.job 
WHERE jobname LIKE '%price%';
