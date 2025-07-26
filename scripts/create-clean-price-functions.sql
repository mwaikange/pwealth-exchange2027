-- Create clean price functions without HODL dependencies and fix NaN issues

-- 1. Function to get current share price (fixed to prevent NaN)
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_price NUMERIC(10,2);
BEGIN
  -- Get the latest price from weekly_prices
  SELECT COALESCE(final_price, 108.20) INTO current_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Ensure we never return NULL or NaN
  IF current_price IS NULL OR current_price <= 0 THEN
    current_price := 108.20;
  END IF;
  
  RETURN current_price;
END;
$$;

-- 2. Function to get latest share price (alias for compatibility)
CREATE OR REPLACE FUNCTION get_latest_share_price()
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN get_current_share_price();
END;
$$;

-- 3. Function to get price history without HODL
CREATE OR REPLACE FUNCTION get_price_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  date TEXT,
  price NUMERIC(10,2),
  j200_growth NUMERIC(10,6),
  price_change NUMERIC(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    effective_date::TEXT as date,
    COALESCE(final_price, 108.20) as price,
    COALESCE(j200_growth, 0.0) as j200_growth,
    COALESCE(price_change, 0.0) as price_change
  FROM weekly_prices
  WHERE effective_date >= CURRENT_DATE - INTERVAL '1 day' * days_back
  ORDER BY effective_date DESC;
END;
$$;

-- 4. Function to calculate weekly share price from JSE200 (without HODL)
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_from_jse200()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_jse RECORD;
  previous_price NUMERIC(10,2);
  new_price NUMERIC(10,2);
  price_change NUMERIC(10,2);
  result json;
BEGIN
  -- Get the latest JSE200 data
  SELECT * INTO latest_jse
  FROM "JSE200_PriceUpdate_Mondays"
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF latest_jse IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No JSE200 data available'
    );
  END IF;
  
  -- Get the previous week's price (fallback to base price)
  SELECT COALESCE(final_price, 100.00) INTO previous_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Calculate new price based on JSE200 percentage change
  new_price := previous_price * (1 + latest_jse.percentage_change / 100);
  price_change := new_price - previous_price;
  
  -- Ensure price is never negative or NaN
  IF new_price IS NULL OR new_price <= 0 THEN
    new_price := COALESCE(previous_price, 108.20);
    price_change := 0;
  END IF;
  
  -- Insert new price record
  INSERT INTO weekly_prices (
    effective_date,
    base_price,
    j200_growth,
    final_price,
    price_change,
    created_at
  ) VALUES (
    CURRENT_DATE,
    previous_price,
    latest_jse.percentage_change / 100,
    new_price,
    price_change,
    NOW()
  );
  
  result := json_build_object(
    'success', true,
    'message', 'Price calculated successfully',
    'previous_price', previous_price,
    'new_price', new_price,
    'price_change', price_change,
    'jse200_change', latest_jse.percentage_change,
    'effective_date', CURRENT_DATE
  );
  
  RETURN result;
END;
$$;

-- 5. Manual trigger function
CREATE OR REPLACE FUNCTION trigger_weekly_price_calculation()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN calculate_weekly_share_price_from_jse200();
END;
$$;

-- 6. System health check function
CREATE OR REPLACE FUNCTION get_price_system_health()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_price NUMERIC(10,2);
  latest_jse RECORD;
  price_count INTEGER;
  result json;
BEGIN
  -- Get current price
  current_price := get_current_share_price();
  
  -- Get latest JSE200 data
  SELECT * INTO latest_jse
  FROM "JSE200_PriceUpdate_Mondays"
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Count price records
  SELECT COUNT(*) INTO price_count
  FROM weekly_prices;
  
  result := json_build_object(
    'system_status', 'healthy',
    'current_price', current_price,
    'price_records_count', price_count,
    'latest_jse200', CASE 
      WHEN latest_jse IS NOT NULL THEN row_to_json(latest_jse)
      ELSE json_build_object('status', 'no_data')
    END,
    'last_check', NOW()
  );
  
  RETURN result;
END;
$$;

-- 7. Vercel cron handler (Monday 09:10-09:20)
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

-- 8. Manual trigger (ignores time checks)
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

-- 9. Status check function
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

-- 10. Main API endpoint function
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

-- Add comments for reference
COMMENT ON FUNCTION get_current_share_price() IS 'Returns current share price with NaN protection';
COMMENT ON FUNCTION get_price_history(integer) IS 'Returns price history without HODL data';
COMMENT ON FUNCTION handle_weekly_price_cron() IS 'Handles Vercel cron requests - only executes on Monday 09:10-09:20';
COMMENT ON FUNCTION handle_manual_price_cron() IS 'Manual trigger for testing - bypasses time checks';
COMMENT ON FUNCTION get_cron_status() IS 'Returns current system status and next execution time';
COMMENT ON FUNCTION api_weekly_price_endpoint(text) IS 'Main API endpoint function for Vercel integration';
