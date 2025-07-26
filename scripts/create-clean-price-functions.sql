-- Create clean price functions without any HODL dependencies
-- This replaces all previous functions with HODL-free versions

-- 1️⃣ Clean get_latest_share_price function
CREATE OR REPLACE FUNCTION get_latest_share_price()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_price NUMERIC;
BEGIN
  SELECT final_price INTO latest_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Return default if no price found
  RETURN COALESCE(latest_price, 108.2);
END;
$$;

-- 2️⃣ Clean get_current_share_price function
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_price NUMERIC;
BEGIN
  -- Get the most recent final price
  SELECT final_price INTO current_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Return default price if no data found
  RETURN COALESCE(current_price, 108.2);
END;
$$;

-- 3️⃣ Fixed get_price_history function (corrected table reference)
CREATE OR REPLACE FUNCTION get_price_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  date TEXT,
  price NUMERIC,
  j200_growth NUMERIC,
  price_change NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.effective_date::TEXT as date,
    wp.final_price as price,
    COALESCE(wp.j200_growth, 0) as j200_growth,
    COALESCE(wp.price_change, 0) as price_change
  FROM weekly_prices wp
  WHERE wp.effective_date >= (CURRENT_DATE - INTERVAL '1 day' * days_back)
  ORDER BY wp.effective_date DESC;
END;
$$;

-- 4️⃣ Clean validate_jse200_data function
CREATE OR REPLACE FUNCTION validate_jse200_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_result json;
  total_records INTEGER;
  recent_records INTEGER;
  data_quality TEXT;
BEGIN
  -- Count total JSE200 records
  SELECT COUNT(*) INTO total_records
  FROM "JSE200_PriceUpdate_Mondays";
  
  -- Count recent records (last 8 weeks)
  SELECT COUNT(*) INTO recent_records
  FROM "JSE200_PriceUpdate_Mondays"
  WHERE created_at > (now() - INTERVAL '8 weeks');
  
  -- Determine data quality
  data_quality := CASE 
    WHEN recent_records >= 6 THEN 'GOOD'
    WHEN recent_records >= 3 THEN 'FAIR'
    ELSE 'POOR'
  END;
  
  validation_result := json_build_object(
    'total_records', total_records,
    'recent_records_8w', recent_records,
    'data_quality', data_quality,
    'last_update', (
      SELECT created_at 
      FROM "JSE200_PriceUpdate_Mondays" 
      ORDER BY created_at DESC 
      LIMIT 1
    ),
    'validation_timestamp', now()
  );
  
  RETURN validation_result;
END;
$$;

-- 5️⃣ Clean get_price_calculation_summary function
CREATE OR REPLACE FUNCTION get_price_calculation_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  summary_result json;
  total_calculations INTEGER;
  latest_calculation RECORD;
  avg_price_change NUMERIC;
BEGIN
  -- Count total price calculations
  SELECT COUNT(*) INTO total_calculations
  FROM weekly_prices;
  
  -- Get latest calculation
  SELECT * INTO latest_calculation
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Calculate average price change
  SELECT AVG(price_change) INTO avg_price_change
  FROM weekly_prices
  WHERE price_change IS NOT NULL;
  
  summary_result := json_build_object(
    'total_calculations', total_calculations,
    'latest_calculation_date', latest_calculation.effective_date,
    'latest_price', latest_calculation.final_price,
    'latest_change', latest_calculation.price_change,
    'average_weekly_change', ROUND(avg_price_change, 2),
    'summary_timestamp', now()
  );
  
  RETURN summary_result;
END;
$$;

-- 6️⃣ Clean get_price_system_health function
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

-- 7️⃣ Clean simulate_price_calculation function
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

-- 8️⃣ Clean check_price_data_consistency function
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

-- 9️⃣ Clean cron functions (no HODL references)
CREATE OR REPLACE FUNCTION handle_weekly_price_cron()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  current_timestamp TIMESTAMPTZ := now();
  current_day TEXT := trim(to_char(current_timestamp, 'Day'));
  current_hour INTEGER := EXTRACT(HOUR FROM current_timestamp);
  current_minute INTEGER := EXTRACT(MINUTE FROM current_timestamp);
BEGIN
  -- Log the execution
  RAISE NOTICE 'Cron executed at: %, Day: %, Hour: %, Minute: %',
    current_timestamp, current_day, current_hour, current_minute;

  -- Check window for Monday 09:10–09:20
  IF current_day = 'Monday' AND current_hour = 9 AND current_minute BETWEEN 10 AND 20 THEN
    result := calculate_weekly_share_price_from_jse200();
    result := result || json_build_object(
      'executed_at', current_timestamp,
      'execution_context', 'vercel_cron',
      'day_check', 'Monday - OK',
      'time_check', format('09:%s - OK', current_minute)
    );
    RETURN result;
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Not executed - outside Monday 09:10-09:20 window',
      'current_time', current_timestamp,
      'current_day', current_day,
      'current_hour', current_hour,
      'current_minute', current_minute,
      'expected', 'Monday between 09:10-09:20'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION handle_manual_price_cron()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json := calculate_weekly_share_price_from_jse200();
BEGIN
  result := result || json_build_object(
    'executed_at', now(),
    'execution_context', 'manual_trigger',
    'note', 'Time checks bypassed for manual execution'
  );
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_cron_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_jse RECORD;
  latest_price RECORD;
  next_monday DATE := date_trunc('week', CURRENT_DATE + INTERVAL '7 days')::DATE;
BEGIN
  SELECT * INTO latest_jse
  FROM "JSE200_PriceUpdate_Mondays"
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT * INTO latest_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;

  RETURN json_build_object(
    'current_time', now(),
    'next_execution', next_monday || ' 09:15:00',
    'latest_jse200', row_to_json(latest_jse),
    'latest_price', row_to_json(latest_price),
    'current_share_price', get_current_share_price(),
    'system_status', 'ready'
  );
END;
$$;

CREATE OR REPLACE FUNCTION api_weekly_price_endpoint(action_param TEXT DEFAULT 'status')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE action_param
    WHEN 'calculate' THEN
      RETURN handle_weekly_price_cron();
    WHEN 'manual' THEN
      RETURN handle_manual_price_cron();
    WHEN 'status' THEN
      RETURN get_cron_status();
    WHEN 'current_price' THEN
      RETURN json_build_object(
        'current_price', get_current_share_price(),
        'timestamp', now()
      );
    ELSE
      RETURN json_build_object(
        'error', 'Invalid action',
        'available_actions', ARRAY['calculate', 'manual', 'status', 'current_price']
      );
  END CASE;
END;
$$;

-- 🔟 Add clean comments
COMMENT ON FUNCTION get_price_history(INTEGER) IS 'Returns price history based on JSE200 data only - HODL functionality removed';
COMMENT ON FUNCTION get_latest_share_price() IS 'Returns the most recent share price - no HODL dependencies';
COMMENT ON FUNCTION get_current_share_price() IS 'Returns current share price - simplified without HODL';
COMMENT ON FUNCTION validate_jse200_data() IS 'Validates JSE200 data quality - HODL references removed';
COMMENT ON FUNCTION get_price_calculation_summary() IS 'Price calculation summary - clean of HODL dependencies';
COMMENT ON FUNCTION get_price_system_health() IS 'System health check - HODL functionality removed';
COMMENT ON FUNCTION simulate_price_calculation(NUMERIC, TEXT) IS 'Price simulation based on JSE200 changes only';
COMMENT ON FUNCTION check_price_data_consistency() IS 'Data consistency check - no HODL validation';
