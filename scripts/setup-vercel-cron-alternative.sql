-- Final SQL script for Vercel cron integration with proper TIMESTAMPTZ handling
-- This replaces the previous version and fixes all timestamp-related issues

-- 1️⃣ Function: Handles Vercel cron trigger (Monday 09:10–09:20)
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

-- 2️⃣ Function: Manual trigger (ignores time checks)
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

-- 3️⃣ Function: Status check with proper TIMESTAMPTZ handling
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

-- 4️⃣ Function: Main API endpoint
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

-- 5️⃣ Comments for reference
COMMENT ON FUNCTION handle_weekly_price_cron() IS 'Handles Vercel cron requests - only executes on Monday 09:10-09:20';
COMMENT ON FUNCTION handle_manual_price_cron() IS 'Manual trigger for testing - bypasses time checks';
COMMENT ON FUNCTION get_cron_status() IS 'Returns current system status and next execution time';
COMMENT ON FUNCTION api_weekly_price_endpoint(text) IS 'Main API endpoint function for Vercel integration';
