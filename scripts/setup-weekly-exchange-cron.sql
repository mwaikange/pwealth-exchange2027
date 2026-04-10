-- Setup cron jobs for weekly exchange management
-- This sets up the automated weekly cycle for the exchange

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing cron jobs for exchange management
SELECT cron.unschedule('weekly-exchange-close');
SELECT cron.unschedule('weekly-price-calculation');
SELECT cron.unschedule('weekly-history-clear');
SELECT cron.unschedule('weekly-exchange-open');

-- 1. Close exchange every Sunday at 23:59 (clear all orders)
SELECT cron.schedule(
    'weekly-exchange-close',
    '59 23 * * 0',  -- Sunday 23:59
    'SELECT close_exchange_weekly();'
);

-- 2. Calculate new share price every Monday at 09:20
SELECT cron.schedule(
    'weekly-price-calculation',
    '20 9 * * 1',   -- Monday 09:20
    'SELECT calculate_weekly_share_price_simplified();'
);

-- 3. Clear order history every Monday at 09:23
SELECT cron.schedule(
    'weekly-history-clear',
    '23 9 * * 1',   -- Monday 09:23
    'SELECT clear_weekly_order_history();'
);

-- 4. Open exchange every Monday at 09:25
SELECT cron.schedule(
    'weekly-exchange-open',
    '25 9 * * 1',   -- Monday 09:25
    'SELECT open_exchange_weekly();'
);

-- Verify cron jobs are scheduled
SELECT 
    jobname,
    schedule,
    command,
    active,
    jobid
FROM cron.job 
WHERE jobname LIKE 'weekly-%'
ORDER BY jobname;

-- Create a function to manually trigger the full weekly cycle (for testing)
CREATE OR REPLACE FUNCTION trigger_weekly_cycle_test()
RETURNS JSON AS $$
DECLARE
    close_result JSON;
    price_result JSON;
    history_result JSON;
    open_result JSON;
    final_result JSON;
BEGIN
    -- Step 1: Close exchange
    SELECT close_exchange_weekly() INTO close_result;
    
    -- Step 2: Calculate new price
    SELECT calculate_weekly_share_price_simplified() INTO price_result;
    
    -- Step 3: Clear history
    SELECT clear_weekly_order_history() INTO history_result;
    
    -- Step 4: Open exchange
    SELECT open_exchange_weekly() INTO open_result;
    
    -- Combine results
    final_result := json_build_object(
        'success', true,
        'message', 'Full weekly cycle completed successfully',
        'steps', json_build_object(
            'close_exchange', close_result,
            'calculate_price', price_result,
            'clear_history', history_result,
            'open_exchange', open_result
        ),
        'completed_at', NOW()
    );
    
    RETURN final_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error in weekly cycle: ' || SQLERRM,
            'error_code', 'WEEKLY_CYCLE_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIXED: Create a function to check cron job status (removed ORDER BY from aggregate)
CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS JSON AS $$
DECLARE
    job_status JSON;
    job_count INTEGER;
BEGIN
    -- Get job count first
    SELECT COUNT(*) INTO job_count
    FROM cron.job 
    WHERE jobname LIKE 'weekly-%';
    
    -- Get job details without ORDER BY in aggregate
    SELECT json_agg(job_info) INTO job_status
    FROM (
        SELECT json_build_object(
            'job_name', jobname,
            'schedule', schedule,
            'command', command,
            'active', active,
            'job_id', jobid
        ) as job_info
        FROM cron.job 
        WHERE jobname LIKE 'weekly-%'
        ORDER BY jobname
    ) ordered_jobs;
    
    RETURN json_build_object(
        'success', true,
        'cron_jobs', COALESCE(job_status, '[]'::json),
        'total_jobs', job_count,
        'checked_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log the setup completion
DO $$
BEGIN
    RAISE NOTICE 'Weekly exchange cron jobs have been set up successfully:';
    RAISE NOTICE '- Sunday 23:59: Close exchange and clear orders';
    RAISE NOTICE '- Monday 09:20: Calculate new share price';
    RAISE NOTICE '- Monday 09:23: Clear order history';
    RAISE NOTICE '- Monday 09:25: Open exchange for trading';
    RAISE NOTICE '';
    RAISE NOTICE 'Use SELECT get_cron_job_status(); to check job status';
    RAISE NOTICE 'Use SELECT trigger_weekly_cycle_test(); to test the full cycle';
END $$;
