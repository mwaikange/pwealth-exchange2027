-- Setup cron job to run every Monday at 09:15
-- Note: This requires pg_cron extension to be enabled

-- Enable pg_cron extension (run as superuser if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing cron job if it exists
SELECT cron.unschedule('weekly-share-price-calculation') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly-share-price-calculation'
);

-- Schedule the weekly price calculation for every Monday at 09:15
SELECT cron.schedule(
  'weekly-share-price-calculation',
  '15 9 * * 1', -- Every Monday at 09:15 (cron format: minute hour day month weekday)
  'SELECT calculate_weekly_share_price_from_jse200();'
);

-- Verify cron job was created
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job 
WHERE jobname = 'weekly-share-price-calculation';

-- To manually test the cron job execution:
-- SELECT calculate_weekly_share_price_from_jse200();

-- To remove the cron job (if needed):
-- SELECT cron.unschedule('weekly-share-price-calculation');
