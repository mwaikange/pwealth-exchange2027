-- Test script for weekly price calculation
-- This script helps verify the calculation logic works correctly

-- First, let's check what data we have
SELECT 'Current JSE200 Data:' as info;
SELECT 
  week_start_date,
  price,
  percent_change,
  day_of_week,
  created_at
FROM JSE200_PriceUpdate_Mondays
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Current Weekly Prices:' as info;
SELECT 
  effective_date,
  base_price,
  j200_growth,
  hodl_percentage,
  final_price,
  price_change,
  created_at
FROM weekly_prices
ORDER BY effective_date DESC
LIMIT 5;

-- Test the current share price function
SELECT 'Current Share Price:' as info;
SELECT get_current_share_price() as current_price;

-- Insert some test JSE200 data if none exists
INSERT INTO JSE200_PriceUpdate_Mondays (
  week_start_date,
  price,
  percent_change,
  day_of_week
) VALUES 
  (date_trunc('week', CURRENT_DATE)::date, 50000.00, 2.5, 'Monday'),
  (date_trunc('week', CURRENT_DATE - INTERVAL '7 days')::date, 48780.49, -1.8, 'Monday'),
  (date_trunc('week', CURRENT_DATE - INTERVAL '14 days')::date, 49658.33, 3.2, 'Monday')
ON CONFLICT (week_start_date) DO NOTHING;

-- Test the calculation function
SELECT 'Testing Price Calculation:' as info;
SELECT trigger_weekly_price_calculation() as calculation_result;

-- Check the results
SELECT 'Results After Calculation:' as info;
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

-- Test price history function
SELECT 'Price History:' as info;
SELECT * FROM get_price_history(5);

-- Test JSE200 history function
SELECT 'JSE200 History:' as info;
SELECT * FROM get_jse200_history(5);

-- Verify the calculation manually
SELECT 'Manual Calculation Verification:' as info;
WITH latest_data AS (
  SELECT 
    (SELECT final_price FROM weekly_prices ORDER BY effective_date DESC LIMIT 1 OFFSET 1) as prev_price,
    (SELECT percent_change FROM JSE200_PriceUpdate_Mondays ORDER BY created_at DESC LIMIT 1) as pct_change
)
SELECT 
  prev_price,
  pct_change,
  prev_price * (1 + (pct_change / 100)) as manual_calculation,
  (SELECT final_price FROM weekly_prices ORDER BY effective_date DESC LIMIT 1) as function_result
FROM latest_data;
