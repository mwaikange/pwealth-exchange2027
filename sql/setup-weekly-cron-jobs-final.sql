-- Setup Weekly Cron Jobs for Order Lifecycle
-- Run this after the main system is set up

-- Note: These cron jobs use UTC time, adjust for your timezone
-- Africa/Windhoek is UTC+2, so:
-- - Monday 09:00 local = Monday 07:00 UTC
-- - Sunday 23:59 local = Sunday 21:59 UTC

-- 1. Set weekly price every Monday at 07:00 UTC (09:00 Windhoek time)
SELECT cron.schedule(
    'set-weekly-price',
    '0 7 * * 1',  -- Every Monday at 07:00 UTC
    'SELECT set_weekly_price();'
);

-- 2. Expire old orders every Sunday at 21:59 UTC (23:59 Windhoek time)
SELECT cron.schedule(
    'expire-weekly-orders', 
    '59 21 * * 0',  -- Every Sunday at 21:59 UTC
    'SELECT expire_weekly_orders();'
);

-- 3. Run order matching every 2 minutes during trading hours
SELECT cron.schedule(
    'match-orders-continuous',
    '*/2 * * * *',  -- Every 2 minutes
    $$
    DO $$
    DECLARE
        trading_status JSON;
    BEGIN
        -- Check if trading is allowed
        SELECT is_trading_allowed() INTO trading_status;
        
        -- Only run matching if trading is allowed
        IF (trading_status->>'trading_allowed')::BOOLEAN THEN
            PERFORM match_orders();
        END IF;
    END $$;
    $$
);

-- 4. Clean up old matching logs weekly (keep last 30 days)
SELECT cron.schedule(
    'cleanup-matching-logs',
    '0 2 * * 1',  -- Every Monday at 02:00 UTC
    'DELETE FROM order_matching_log WHERE created_at < NOW() - INTERVAL ''30 days'';'
);

-- View all scheduled jobs
SELECT * FROM cron.job;

-- To remove a job if needed (uncomment to use):
-- SELECT cron.unschedule('job-name');
