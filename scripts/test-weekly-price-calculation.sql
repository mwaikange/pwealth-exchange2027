-- Test script to verify the weekly price calculation logic

-- 1. Check current data
SELECT 'Current JSE200 Data:' as info;
SELECT * FROM JSE200_PriceUpdate_Mondays ORDER BY created_at DESC LIMIT 3;

SELECT 'Current Weekly Prices:' as info;
SELECT * FROM weekly_prices ORDER BY week_start DESC LIMIT 3;

-- 2. Test the calculation function
SELECT 'Testing Price Calculation Function:' as info;
SELECT calculate_weekly_share_price_from_jse200() as calculation_result;

-- 3. Check updated prices
SELECT 'Updated Weekly Prices:' as info;
SELECT * FROM weekly_prices ORDER BY week_start DESC LIMIT 3;

-- 4. Test get_current_share_price function
SELECT 'Current Share Price:' as info;
SELECT get_current_share_price() as current_price;

-- 5. Test price history function
SELECT 'Price History:' as info;
SELECT * FROM get_price_history(5);

-- 6. Insert test JSE200 data with different percentage changes
INSERT INTO JSE200_PriceUpdate_Mondays (date, week_start, percentage_change, jse200_value)
VALUES 
  (CURRENT_DATE + INTERVAL '7 days', date_trunc('week', CURRENT_DATE + INTERVAL '7 days')::date, 5.2, 77742.00),
  (CURRENT_DATE + INTERVAL '14 days', date_trunc('week', CURRENT_DATE + INTERVAL '14 days')::date, -3.1, 75333.00)
ON CONFLICT (week_start) DO UPDATE SET
  percentage_change = EXCLUDED.percentage_change,
  jse200_value = EXCLUDED.jse200_value,
  created_at = now();

-- 7. Test calculation with new data
SELECT 'Testing with New JSE200 Data:' as info;
SELECT calculate_weekly_share_price_from_jse200() as new_calculation;

-- 8. Verify the calculation manually
WITH price_calc AS (
  SELECT 
    wp.price as last_price,
    jse.percentage_change,
    wp.price * (1 + (jse.percentage_change / 100)) as calculated_price
  FROM weekly_prices wp
  CROSS JOIN (
    SELECT percentage_change 
    FROM JSE200_PriceUpdate_Mondays 
    ORDER BY created_at DESC 
    LIMIT 1
  ) jse
  ORDER BY wp.week_start DESC
  LIMIT 1
)
SELECT 
  'Manual Verification:' as info,
  last_price,
  percentage_change,
  calculated_price,
  ROUND(calculated_price, 2) as rounded_price
FROM price_calc;
