-- Setup cron job to run every Monday at 09:15
-- Note: This requires pg_cron extension to be enabled

-- Enable pg_cron extension (run as superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the weekly price calculation for every Monday at 09:15
SELECT cron.schedule(
  'weekly-share-price-calculation',
  '15 9 * * 1', -- Every Monday at 09:15 (cron format: minute hour day month weekday)
  'SELECT calculate_weekly_share_price_from_jse200();'
);

-- Alternative: Schedule via Supabase Edge Functions (if pg_cron not available)
-- This would be handled by the updated weekly-price-cron function

-- Verify cron job was created
SELECT * FROM cron.job WHERE jobname = 'weekly-share-price-calculation';

-- To remove the cron job (if needed):
-- SELECT cron.unschedule('weekly-share-price-calculation');
