-- Alternative cron setup for Vercel deployment
-- This creates functions that can be called via HTTP endpoints
-- Updated with fixes for TIMESTAMPTZ, case sensitivity, and PL/pgSQL syntax

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

-- 3️⃣ Function: Status check
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

-- 6️⃣ Additional helper functions for monitoring and debugging
CREATE OR REPLACE FUNCTION get_price_calculation_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  summary json;
  total_weeks INTEGER;
  price_trend TEXT;
  latest_change NUMERIC;
BEGIN
  -- Get total number of weeks with price data
  SELECT COUNT(*) INTO total_weeks FROM weekly_prices;
  
  -- Get latest price change
  SELECT price_change INTO latest_change 
  FROM weekly_prices 
  ORDER BY effective_date DESC 
  LIMIT 1;
  
  -- Determine trend
  IF latest_change > 0 THEN
    price_trend := 'INCREASING';
  ELSIF latest_change < 0 THEN
    price_trend := 'DECREASING';
  ELSE
    price_trend := 'STABLE';
  END IF;
  
  summary := json_build_object(
    'total_weeks_tracked', total_weeks,
    'current_price', get_current_share_price(),
    'latest_change_amount', latest_change,
    'price_trend', price_trend,
    'last_updated', (SELECT created_at FROM weekly_prices ORDER BY effective_date DESC LIMIT 1),
    'system_health', 'OPERATIONAL'
  );
  
  RETURN summary;
END;
$$;

-- 7️⃣ Function to validate JSE200 data integrity
CREATE OR REPLACE FUNCTION validate_jse200_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_result json;
  missing_weeks INTEGER;
  null_percent_changes INTEGER;
  latest_data_age INTERVAL;
BEGIN
  -- Count records with null percent_change
  SELECT COUNT(*) INTO null_percent_changes 
  FROM "JSE200_PriceUpdate_Mondays" 
  WHERE percent_change IS NULL;
  
  -- Calculate age of latest data
  SELECT (now() - MAX(created_at)) INTO latest_data_age 
  FROM "JSE200_PriceUpdate_Mondays";
  
  -- Count missing weeks (basic check)
  SELECT COUNT(*) INTO missing_weeks 
  FROM generate_series(
    (SELECT MIN(week_start_date) FROM "JSE200_PriceUpdate_Mondays"),
    CURRENT_DATE,
    '1 week'::interval
  ) AS expected_week
  WHERE expected_week::date NOT IN (
    SELECT week_start_date FROM "JSE200_PriceUpdate_Mondays"
  );
  
  validation_result := json_build_object(
    'null_percent_changes', null_percent_changes,
    'missing_weeks_estimate', missing_weeks,
    'latest_data_age_hours', EXTRACT(EPOCH FROM latest_data_age) / 3600,
    'data_quality', CASE 
      WHEN null_percent_changes = 0 AND latest_data_age < INTERVAL '7 days' THEN 'GOOD'
      WHEN null_percent_changes > 0 OR latest_data_age > INTERVAL '14 days' THEN 'POOR'
      ELSE 'FAIR'
    END,
    'validation_timestamp', now()
  );
  
  RETURN validation_result;
END;
$$;

-- 8️⃣ Instructions for Vercel setup
/*
To set up Vercel Cron integration:

1. Add to vercel.json:
{
  "crons": [
    {
      "path": "/api/cron/weekly-price",
      "schedule": "15 9 * * 1"
    }
  ]
}

2. Create app/api/cron/weekly-price/route.ts:
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase.rpc('handle_weekly_price_cron')
    
    if (error) {
      console.error('Cron execution error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }
    
    console.log('Cron execution result:', data)
    return Response.json(data)
  } catch (error) {
    console.error('Cron function error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

3. For manual testing, create app/api/test/price-calculation/route.ts:
export async function GET() {
  const { data } = await supabase.rpc('handle_manual_price_cron')
  return Response.json(data)
}

4. For status monitoring, create app/api/status/price-system/route.ts:
export async function GET() {
  const { data } = await supabase.rpc('get_cron_status')
  return Response.json(data)
}
*/
