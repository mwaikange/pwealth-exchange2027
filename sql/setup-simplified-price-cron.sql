-- Setup cron job for simplified weekly price calculation
-- This will run every Monday at 09:20 AM

-- First, ensure pg_cron extension is enabled (if available)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the weekly price calculation for every Monday at 09:20
-- Note: This requires pg_cron extension or Supabase Edge Functions with cron
SELECT cron.schedule(
    'weekly-price-calculation-simplified',
    '20 9 * * 1', -- Every Monday at 09:20 (cron format: minute hour day month weekday)
    'SELECT calculate_weekly_share_price_simplified();'
);

-- Alternative: Create a trigger-based approach if cron is not available
-- This creates a function that can be called manually or via API

CREATE OR REPLACE FUNCTION trigger_weekly_price_calculation()
RETURNS json AS $$
DECLARE
    result json;
    current_day text;
    current_time time;
BEGIN
    -- Check if it's Monday
    current_day := to_char(CURRENT_DATE, 'Day');
    current_time := CURRENT_TIME;
    
    -- Log the attempt
    RAISE NOTICE 'Price calculation triggered on % at %', current_day, current_time;
    
    -- Always allow manual trigger, but log if it's not Monday 09:20
    IF trim(current_day) != 'Monday' OR current_time < '09:20:00' OR current_time > '09:30:00' THEN
        RAISE NOTICE 'Manual trigger outside scheduled time (Monday 09:20-09:30)';
    END IF;
    
    -- Execute the calculation
    SELECT calculate_weekly_share_price_simplified() INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to execute the trigger function
GRANT EXECUTE ON FUNCTION trigger_weekly_price_calculation() TO authenticated;
