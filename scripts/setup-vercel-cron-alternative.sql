-- Alternative setup for Vercel Cron (if pg_cron is not available)
-- This creates a webhook endpoint that can be called by Vercel Cron

-- Create a function that can be called via HTTP
CREATE OR REPLACE FUNCTION handle_weekly_price_cron()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  current_time timestamptz;
  current_day integer;
  current_hour integer;
  current_minute integer;
BEGIN
  current_time := now();
  current_day := EXTRACT(dow FROM current_time); -- 1 = Monday
  current_hour := EXTRACT(hour FROM current_time);
  current_minute := EXTRACT(minute FROM current_time);
  
  -- Check if it's Monday at 09:15 (with 5-minute window)
  IF current_day = 1 AND current_hour = 9 AND current_minute BETWEEN 15 AND 20 THEN
    -- Execute the price calculation
    result := calculate_weekly_share_price_from_jse200();
    
    -- Add timing info
    result := result || json_build_object(
      'executed_at', current_time,
      'cron_triggered', true,
      'day_of_week', current_day,
      'hour', current_hour,
      'minute', current_minute
    );
  ELSE
    -- Not the right time, return info
    result := json_build_object(
      'success', false,
      'message', 'Not scheduled time for price calculation',
      'current_time', current_time,
      'day_of_week', current_day,
      'hour', current_hour,
      'minute', current_minute,
      'expected', 'Monday at 09:15'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Instructions for Vercel Cron setup:
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
-- 2. Create /api/cron/weekly-price/route.ts that calls this function
