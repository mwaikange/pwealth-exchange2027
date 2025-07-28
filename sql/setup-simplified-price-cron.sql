-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing cron jobs for price calculation
SELECT cron.unschedule('weekly-price-calculation');
SELECT cron.unschedule('weekly-share-price-update');

-- Schedule the simplified weekly price calculation to run every Monday at 09:20
-- Cron format: minute hour day month day_of_week
-- '20 9 * * 1' = 09:20 on Mondays (1 = Monday)
SELECT cron.schedule(
  'weekly-share-price-simplified',
  '20 9 * * 1',
  'SELECT calculate_weekly_share_price_simplified();'
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'weekly-share-price-simplified';
