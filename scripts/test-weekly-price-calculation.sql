-- Test script to verify the weekly price calculation logic with actual column names

-- 1. Check current JSE200 data
SELECT 'Current JSE200 Data:' as info;
SELECT 
  week_start_date,
  price,
  percent_change,
  day_of_week,
  created_at
FROM JSE200_PriceUpdate_Mondays 
ORDER BY created_at DESC 
LIMIT 3;

-- 2. Check current weekly prices
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
LIMIT 3;

-- 3. Test the calculation function
SELECT 'Testing Price Calculation Function:' as info;
SELECT calculate_weekly_share_price_from_jse200() as calculation_result;

-- 4. Check updated prices after calculation
SELECT 'Updated Weekly Prices After Calculation:' as info;
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
LIMIT 3;

-- 5. Test get_current_share_price function
SELECT 'Current Share Price from Function:' as info;
SELECT get_current_share_price() as current_price;

-- 6. Test price history function
SELECT 'Price History:' as info;
SELECT * FROM get_price_history(5);

-- 7. Test JSE200 history function
SELECT 'JSE200 History:' as info;
SELECT * FROM get_jse200_history(5);

-- 8. Insert test JSE200 data with different percentage changes for future weeks
INSERT INTO JSE200_PriceUpdate_Mondays (
  week_start_date, 
  price, 
  percent_change, 
  day_of_week
)
VALUES 
  (
    date_trunc('week', CURRENT_DATE + INTERVAL '7 days')::date, 
    77742.00, 
    5.2, 
    'Monday'
  ),
  (
    date_trunc('week', CURRENT_DATE + INTERVAL '14 days')::date, 
    75333.00, 
    -3.1, 
    'Monday'
  )
ON CONFLICT (week_start_date) DO UPDATE SET
  price = EXCLUDED.price,
  percent_change = EXCLUDED.percent_change,
  day_of_week = EXCLUDED.day_of_week,
  updated_at = now();

-- 9. Test calculation with new data
SELECT 'Testing with New JSE200 Data:' as info;
SELECT calculate_weekly_share_price_from_jse200() as new_calculation;

-- 10. Verify the calculation manually
WITH price_calc AS (
  SELECT 
    wp.final_price as last_price,
    jse.percent_change,
    wp.final_price * (1 + (jse.percent_change / 100)) as calculated_price
  FROM weekly_prices wp
  CROSS JOIN (
    SELECT percent_change 
    FROM JSE200_PriceUpdate_Mondays 
    ORDER BY created_at DESC 
    LIMIT 1
  ) jse
  ORDER BY wp.effective_date DESC
  LIMIT 1
)
SELECT 
  'Manual Verification:' as info,
  last_price,
  percent_change,
  calculated_price,
  ROUND(calculated_price, 2) as rounded_price
FROM price_calc;

-- 11. Test edge cases
SELECT 'Testing Edge Cases:' as info;

-- Test with null percent_change
INSERT INTO JSE200_PriceUpdate_Mondays (
  week_start_date, 
  price, 
  percent_change, 
  day_of_week
)
VALUES 
  (
    date_trunc('week', CURRENT_DATE + INTERVAL '21 days')::date, 
    75000.00, 
    NULL, 
    'Monday'
  )
ON CONFLICT (week_start_date) DO UPDATE SET
  price = EXCLUDED.price,
  percent_change = EXCLUDED.percent_change,
  day_of_week = EXCLUDED.day_of_week,
  updated_at = now();

-- This should return an error about null percent_change
SELECT 'Testing NULL percent_change (should error):' as info;
SELECT calculate_weekly_share_price_from_jse200() as null_test_result;
