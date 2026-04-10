-- Enhanced monitoring and debugging tools for the price calculation system
-- These functions help track system health and troubleshoot issues

-- 1️⃣ Comprehensive system health check
CREATE OR REPLACE FUNCTION get_price_system_health()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  health_report json;
  jse_validation json;
  price_summary json;
  recent_calculations INTEGER;
BEGIN
  -- Get JSE200 data validation
  jse_validation := validate_jse200_data();
  
  -- Get price calculation summary
  price_summary := get_price_calculation_summary();
  
  -- Count recent calculations (last 30 days)
  SELECT COUNT(*) INTO recent_calculations
  FROM weekly_prices
  WHERE created_at > (now() - INTERVAL '30 days');
  
  health_report := json_build_object(
    'timestamp', now(),
    'overall_status', CASE 
      WHEN (jse_validation->>'data_quality') = 'GOOD' AND recent_calculations >= 4 THEN 'HEALTHY'
      WHEN (jse_validation->>'data_quality') = 'FAIR' OR recent_calculations >= 2 THEN 'WARNING'
      ELSE 'CRITICAL'
    END,
    'jse200_data_quality', jse_validation,
    'price_calculation_summary', price_summary,
    'recent_calculations_30d', recent_calculations,
    'current_share_price', get_current_share_price(),
    'next_scheduled_run', date_trunc('week', CURRENT_DATE + INTERVAL '7 days')::date || ' 09:15:00'
  );
  
  RETURN health_report;
END;
$$;

-- 2️⃣ Function to simulate price calculations for testing
CREATE OR REPLACE FUNCTION simulate_price_calculation(
  test_percent_change NUMERIC,
  test_description TEXT DEFAULT 'Test simulation'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_price NUMERIC;
  simulated_price NUMERIC;
  simulation_result json;
BEGIN
  -- Get current price
  current_price := get_current_share_price();
  
  -- Calculate simulated price
  simulated_price := ROUND(current_price * (1 + (test_percent_change / 100)), 2);
  
  simulation_result := json_build_object(
    'simulation_description', test_description,
    'current_price', current_price,
    'test_percent_change', test_percent_change,
    'simulated_new_price', simulated_price,
    'price_difference', (simulated_price - current_price),
    'percentage_impact', ROUND(((simulated_price - current_price) / current_price) * 100, 4),
    'calculation_formula', format('%s × (1 + %s/100) = %s', current_price, test_percent_change, simulated_price),
    'simulation_timestamp', now()
  );
  
  RETURN simulation_result;
END;
$$;

-- 3️⃣ Function to get detailed price history with calculations
CREATE OR REPLACE FUNCTION get_detailed_price_history(weeks_back INTEGER DEFAULT 10)
RETURNS TABLE(
  week_number INTEGER,
  effective_date DATE,
  base_price NUMERIC,
  jse200_percent_change NUMERIC,
  calculated_price NUMERIC,
  actual_price_change NUMERIC,
  cumulative_return_percent NUMERIC,
  week_over_week_change NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH price_history AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY wp.effective_date DESC) as week_num,
      wp.effective_date,
      wp.base_price,
      wp.j200_growth as jse200_change,
      wp.final_price,
      wp.price_change,
      LAG(wp.final_price) OVER (ORDER BY wp.effective_date) as prev_price
    FROM weekly_prices wp
    ORDER BY wp.effective_date DESC
    LIMIT weeks_back
  ),
  calculated_history AS (
    SELECT 
      week_num,
      effective_date,
      base_price,
      jse200_change,
      final_price,
      price_change,
      -- Calculate cumulative return from first price
      ROUND(((final_price / FIRST_VALUE(final_price) OVER (ORDER BY effective_date DESC ROWS UNBOUNDED PRECEDING)) - 1) * 100, 2) as cum_return,
      -- Week over week change
      CASE 
        WHEN prev_price IS NOT NULL THEN ROUND(((final_price / prev_price) - 1) * 100, 2)
        ELSE 0
      END as wow_change
    FROM price_history
  )
  SELECT 
    week_num::INTEGER,
    effective_date,
    base_price,
    jse200_change,
    final_price,
    price_change,
    cum_return,
    wow_change
  FROM calculated_history
  ORDER BY effective_date DESC;
END;
$$;

-- 4️⃣ Function to check for data inconsistencies
CREATE OR REPLACE FUNCTION check_price_data_consistency()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  consistency_report json;
  calculation_errors INTEGER := 0;
  missing_jse_data INTEGER := 0;
  orphaned_prices INTEGER := 0;
BEGIN
  -- Check for calculation errors (where manual calculation doesn't match stored result)
  WITH calc_check AS (
    SELECT 
      wp.effective_date,
      wp.base_price,
      wp.j200_growth,
      wp.final_price,
      ROUND(wp.base_price * (1 + (wp.j200_growth / 100)), 2) as expected_price,
      ABS(wp.final_price - ROUND(wp.base_price * (1 + (wp.j200_growth / 100)), 2)) as price_diff
    FROM weekly_prices wp
    WHERE wp.base_price IS NOT NULL AND wp.j200_growth IS NOT NULL
  )
  SELECT COUNT(*) INTO calculation_errors
  FROM calc_check
  WHERE price_diff > 0.01; -- Allow for small rounding differences
  
  -- Check for weekly prices without corresponding JSE200 data
  SELECT COUNT(*) INTO orphaned_prices
  FROM weekly_prices wp
  LEFT JOIN "JSE200_PriceUpdate_Mondays" jse ON wp.effective_date = jse.week_start_date
  WHERE jse.week_start_date IS NULL AND wp.effective_date != date_trunc('week', CURRENT_DATE)::date;
  
  -- Check for JSE200 data without corresponding price calculations
  SELECT COUNT(*) INTO missing_jse_data
  FROM "JSE200_PriceUpdate_Mondays" jse
  LEFT JOIN weekly_prices wp ON jse.week_start_date = wp.effective_date
  WHERE wp.effective_date IS NULL AND jse.week_start_date <= date_trunc('week', CURRENT_DATE)::date;
  
  consistency_report := json_build_object(
    'check_timestamp', now(),
    'calculation_errors', calculation_errors,
    'orphaned_price_records', orphaned_prices,
    'missing_price_calculations', missing_jse_data,
    'overall_consistency', CASE 
      WHEN calculation_errors = 0 AND orphaned_prices = 0 AND missing_jse_data = 0 THEN 'PERFECT'
      WHEN calculation_errors = 0 AND (orphaned_prices + missing_jse_data) <= 2 THEN 'GOOD'
      WHEN calculation_errors <= 1 AND (orphaned_prices + missing_jse_data) <= 5 THEN 'FAIR'
      ELSE 'POOR'
    END,
    'recommendations', CASE 
      WHEN calculation_errors > 0 THEN 'Review calculation logic and recalculate affected weeks'
      WHEN missing_jse_data > 0 THEN 'Run price calculations for missing JSE200 data'
      WHEN orphaned_prices > 0 THEN 'Verify JSE200 data completeness'
      ELSE 'No action required'
    END
  );
  
  RETURN consistency_report;
END;
$$;

-- 5️⃣ Add helpful comments
COMMENT ON FUNCTION get_price_system_health() IS 'Comprehensive health check for the entire price calculation system';
COMMENT ON FUNCTION simulate_price_calculation(NUMERIC, TEXT) IS 'Simulate price calculation with test percentage change';
COMMENT ON FUNCTION get_detailed_price_history(INTEGER) IS 'Get detailed price history with week-over-week and cumulative returns';
COMMENT ON FUNCTION check_price_data_consistency() IS 'Check for data inconsistencies and calculation errors';
