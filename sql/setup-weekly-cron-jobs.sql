-- Setup Weekly Cron Jobs
-- Run this AFTER the main system is created

-- Note: Supabase uses UTC time, so adjust accordingly
-- Africa/Windhoek is UTC+2, so:
-- Monday 09:00 Windhoek = Monday 07:00 UTC
-- Sunday 23:59 Windhoek = Sunday 21:59 UTC

-- 1. Set weekly price every Monday at 07:00 UTC (09:00 Windhoek)
SELECT cron.schedule(
    'set-weekly-price',
    '0 7 * * 1', -- Monday at 07:00 UTC
    $$SELECT set_weekly_price();$$
);

-- 2. Expire weekly orders every Sunday at 21:59 UTC (23:59 Windhoek)
SELECT cron.schedule(
    'expire-weekly-orders', 
    '59 21 * * 0', -- Sunday at 21:59 UTC
    $$SELECT expire_weekly_orders();$$
);

-- 3. Match orders continuously every 2 minutes
SELECT cron.schedule(
    'match-orders-continuous',
    '*/2 * * * *', -- Every 2 minutes
    $$SELECT match_orders();$$
);

-- Check existing cron jobs
SELECT * FROM cron.job;
