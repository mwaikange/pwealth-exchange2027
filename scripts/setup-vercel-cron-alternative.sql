-- Alternative cron setup for Vercel deployment
-- This creates functions that can be called via HTTP endpoints

-- Create a function to handle Vercel cron requests
CREATE OR REPLACE FUNCTION handle_weekly_price_cron()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  current_timestamp timestamptz;
  current_day text;
  current_hour integer;
  current_minute integer;
BEGIN
  -- Get current time info (fixed variable name)
  current_timestamp := now();
  current_day := to_char(current_timestamp, 'Day');
  current_hour := EXTRACT(hour FROM current_timestamp);
  current_minute := EXTRACT(minute FROM current_timestamp);
  
  -- Log the execution
  RAISE NOTICE 'Cron executed at: %, Day: %, Hour: %, Minute: %', 
    current_timestamp, trim(current_day), current_hour, current_minute;
  
  -- Check if it's Monday and around 09:15 (allow 09:10-09:20 window)
  IF trim(current_day) = 'Monday' AND current_hour = 9 AND current_minute BETWEEN 10 AND 20 THEN
    -- Execute the price calculation
    result := calculate_weekly_share_price_from_jse200();
    
    -- Add execution context
    result := result || json_build_object(
      'executed_at', current_timestamp,
      'execution_context', 'vercel_cron',
      'day_check', 'Monday - OK',
      'time_check', format('09:%s - OK', current_minute)
    );
    
    RETURN result;
  ELSE
    -- Return info about why it didn't execute
    RETURN json_build_object(
      'success', false,
      'message', 'Not executed - outside Monday 09:10-09:20 window',
      'current_time', current_timestamp,
      'current_day', trim(current_day),
      'current_hour', current_hour,
      'current_minute', current_minute,
      'expected', 'Monday between 09:10-09:20'
    );
  END IF;
END;
$$;

-- Create a function for manual testing (ignores time checks)
CREATE OR REPLACE FUNCTION handle_manual_price_cron()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Execute the price calculation regardless of time
  result := calculate_weekly_share_price_from_jse200();
  
  -- Add execution context
  result := result || json_build_object(
    'executed_at', now(),
    'execution_context', 'manual_trigger',
    'note', 'Time checks bypassed for manual execution'
  );
  
  RETURN result;
END;
$$;

-- Create a status check function
CREATE OR REPLACE FUNCTION get_cron_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_jse record;
  latest_price record;
  next_monday date;
BEGIN
  -- Get latest JSE200 data
  SELECT * INTO latest_jse
  FROM JSE200_PriceUpdate_Mondays
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get latest price data
  SELECT * INTO latest_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Calculate next Monday
  next_monday := date_trunc('week', CURRENT_DATE + INTERVAL '7 days')::date;
  
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

-- Create API endpoint helper function
CREATE OR REPLACE FUNCTION api_weekly_price_endpoint(action_param text DEFAULT 'status')
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

-- Add helpful comments
COMMENT ON FUNCTION handle_weekly_price_cron() IS 'Handles Vercel cron requests - only executes on Monday 09:10-09:20';
COMMENT ON FUNCTION handle_manual_price_cron() IS 'Manual trigger for testing - bypasses time checks';
COMMENT ON FUNCTION get_cron_status() IS 'Returns current system status and next execution time';
COMMENT ON FUNCTION api_weekly_price_endpoint(text) IS 'Main API endpoint function for Vercel integration';

-- Instructions for Vercel setup:
-- 1. Add to vercel.json:
-- {
--   "crons": [
--     {
--       "path": "/api/cron/weekly-price",
--       "schedule": "15 9 * * 1"
--     }
--   ]
-- }
-- 
-- 2. Create app/api/cron/weekly-price/route.ts:
-- export async function GET() {
--   const { data } = await supabase.rpc('handle_weekly_price_cron')
--   return Response.json(data)
-- }
