-- Setup cron jobs for weekly exchange management
-- Run this after creating the exchange trading hours functions

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing exchange-related cron jobs
SELECT cron.unschedule('weekly-exchange-close');
SELECT cron.unschedule('weekly-order-history-clear');
SELECT cron.unschedule('weekly-exchange-open');

-- 1. Close exchange every Sunday at 23:59
SELECT cron.schedule(
  'weekly-exchange-close',
  '59 23 * * 0',  -- 23:59 on Sundays (0 = Sunday)
  'SELECT close_exchange_weekly();'
);

-- 2. Clear order history every Monday at 09:23
SELECT cron.schedule(
  'weekly-order-history-clear',
  '23 9 * * 1',   -- 09:23 on Mondays (1 = Monday)
  'SELECT clear_weekly_order_history();'
);

-- 3. Open exchange every Monday at 09:25 (after price calculation at 09:20)
SELECT cron.schedule(
  'weekly-exchange-open',
  '25 9 * * 1',   -- 09:25 on Mondays (1 = Monday)
  'SELECT open_exchange_weekly();'
);

-- Verify the cron jobs were created
SELECT jobname, schedule, command FROM cron.job 
WHERE jobname IN ('weekly-exchange-close', 'weekly-order-history-clear', 'weekly-exchange-open')
ORDER BY jobname;
