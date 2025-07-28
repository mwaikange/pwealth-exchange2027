-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing cron jobs for price calculation
SELECT cron.unschedule('weekly-price-calculation');
SELECT cron.unschedule('weekly-price-calculation-simplified');

-- Schedule the simplified weekly price calculation to run every Monday at 09:20
SELECT cron.schedule(
    'weekly-price-calculation-simplified',
    '20 9 * * 1',  -- Every Monday at 09:20 (cron format: minute hour day month day_of_week)
    'SELECT calculate_weekly_share_price_simplified();'
);

-- Verify the cron job was scheduled
SELECT 
    jobname,
    schedule,
    command,
    active
FROM cron.job 
WHERE jobname = 'weekly-price-calculation-simplified';

-- Log completion
SELECT 'Simplified weekly price cron job scheduled for every Monday at 09:20' as status;
