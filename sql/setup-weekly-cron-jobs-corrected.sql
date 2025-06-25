-- ✅ CORRECTED Weekly Cron Jobs Setup (Already Applied Successfully)
-- This shows what was successfully created

-- 1. ✅ Set weekly price every Monday at 07:00 UTC (09:00 Windhoek time)
-- Job ID 35: set-weekly-price

-- 2. ✅ Expire old orders every Sunday at 21:59 UTC (23:59 Windhoek time)  
-- Job ID 36: expire-weekly-orders

-- 3. ✅ Order matching function created and scheduled every 2 minutes
-- Job ID 37: match-orders-continuous

-- 4. ✅ Clean up old matching logs weekly (keep last 30 days)
-- Job ID 38: cleanup-matching-logs

-- Optional: Clean up duplicate/old cron jobs if needed
-- You have many duplicate refresh jobs (IDs 5-32) that might be cleaned up

-- To view your new weekly trading jobs specifically:
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    CASE 
        WHEN jobname = 'set-weekly-price' THEN 'Sets weekly price Monday 09:00 Windhoek'
        WHEN jobname = 'expire-weekly-orders' THEN 'Expires old orders Sunday 23:59 Windhoek'
        WHEN jobname = 'match-orders-continuous' THEN 'Matches orders every 2 minutes during trading'
        WHEN jobname = 'cleanup-matching-logs' THEN 'Cleans old logs weekly'
        ELSE 'Other job'
    END as description
FROM cron.job 
WHERE jobname IN ('set-weekly-price', 'expire-weekly-orders', 'match-orders-continuous', 'cleanup-matching-logs')
ORDER BY jobid;
