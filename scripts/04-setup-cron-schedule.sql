-- STEP 4: Setup cron jobs for automated exchange management

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing cron jobs for our system
SELECT cron.unschedule('weekly-price-update');
SELECT cron.unschedule('weekly-exchange-open');
SELECT cron.unschedule('weekly-exchange-close');
SELECT cron.unschedule('weekly-history-cleanup');

-- Schedule weekly price calculation (Monday 09:20 Windhoek time = 07:20 UTC)
SELECT cron.schedule(
    'weekly-price-update',
    '20 7 * * 1',  -- Every Monday at 07:20 UTC (09:20 Windhoek time)
    'SELECT calculate_weekly_share_price_simplified();'
);

-- Schedule weekly exchange opening (Monday 10:05 Windhoek time = 08:05 UTC)
SELECT cron.schedule(
    'weekly-exchange-open',
    '5 8 * * 1',   -- Every Monday at 08:05 UTC (10:05 Windhoek time)
    'SELECT open_exchange_weekly();'
);

-- Schedule weekly exchange closing (Friday 16:00 Windhoek time = 14:00 UTC)
SELECT cron.schedule(
    'weekly-exchange-close',
    '0 14 * * 5',  -- Every Friday at 14:00 UTC (16:00 Windhoek time)
    'SELECT close_exchange_weekly();'
);

-- Schedule weekly history cleanup (Saturday 02:00 Windhoek time = 00:00 UTC)
SELECT cron.schedule(
    'weekly-history-cleanup',
    '0 0 * * 6',   -- Every Saturday at 00:00 UTC (02:00 Windhoek time)
    'SELECT clear_weekly_order_history();'
);

-- Create a function to check cron job status
CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS JSON AS $$
DECLARE
    job_count INTEGER;
    jobs_info JSON;
BEGIN
    -- Count our scheduled jobs
    SELECT COUNT(*) INTO job_count
    FROM cron.job 
    WHERE jobname IN (
        'weekly-price-update',
        'weekly-exchange-open', 
        'weekly-exchange-close',
        'weekly-history-cleanup'
    );
    
    -- Get job details
    SELECT json_agg(
        json_build_object(
            'jobname', jobname,
            'schedule', schedule,
            'command', command,
            'active', active,
            'database', database
        )
    ) INTO jobs_info
    FROM cron.job 
    WHERE jobname IN (
        'weekly-price-update',
        'weekly-exchange-open', 
        'weekly-exchange-close',
        'weekly-history-cleanup'
    );
    
    RETURN json_build_object(
        'total_jobs', job_count,
        'jobs', jobs_info,
        'timezone_note', 'All times are UTC. Windhoek is UTC+2',
        'schedule_summary', json_build_object(
            'price_update', 'Monday 09:20 Windhoek (07:20 UTC)',
            'exchange_open', 'Monday 10:05 Windhoek (08:05 UTC)',
            'exchange_close', 'Friday 16:00 Windhoek (14:00 UTC)',
            'history_cleanup', 'Saturday 02:00 Windhoek (00:00 UTC)'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to manually trigger all weekly processes (for testing)
CREATE OR REPLACE FUNCTION trigger_weekly_cycle_manual()
RETURNS JSON AS $$
DECLARE
    price_result JSON;
    open_result JSON;
    close_result JSON;
    cleanup_result JSON;
BEGIN
    -- Step 1: Update price
    SELECT calculate_weekly_share_price_simplified() INTO price_result;
    
    -- Step 2: Open exchange
    SELECT open_exchange_weekly() INTO open_result;
    
    -- Step 3: Close previous week (cleanup)
    SELECT close_exchange_weekly() INTO close_result;
    
    -- Step 4: Clear old history
    SELECT clear_weekly_order_history() INTO cleanup_result;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Manual weekly cycle completed',
        'executed_at', NOW(),
        'results', json_build_object(
            'price_update', price_result,
            'exchange_open', open_result,
            'exchange_close', close_result,
            'history_cleanup', cleanup_result
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error in manual weekly cycle: ' || SQLERRM,
            'error_code', 'MANUAL_CYCLE_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Final success message for step 4
DO $$
DECLARE
    cron_count INTEGER;
    cron_status JSON;
BEGIN
    -- Check if cron jobs were created
    SELECT COUNT(*) INTO cron_count
    FROM cron.job 
    WHERE jobname IN (
        'weekly-price-update',
        'weekly-exchange-open', 
        'weekly-exchange-close',
        'weekly-history-cleanup'
    );
    
    -- Get cron status
    SELECT get_cron_job_status() INTO cron_status;
    
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                      █';
    RAISE NOTICE '█                    ✅ STEP 4 COMPLETED SUCCESSFULLY!                █';
    RAISE NOTICE '█                      Cron Schedule Setup Complete                   █';
    RAISE NOTICE '█                                                                      █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '🕐 CRON JOBS SCHEDULED: %', cron_count;
    RAISE NOTICE '   ✓ weekly-price-update: Monday 09:20 Windhoek (07:20 UTC)';
    RAISE NOTICE '   ✓ weekly-exchange-open: Monday 10:05 Windhoek (08:05 UTC)';
    RAISE NOTICE '   ✓ weekly-exchange-close: Friday 16:00 Windhoek (14:00 UTC)';
    RAISE NOTICE '   ✓ weekly-history-cleanup: Saturday 02:00 Windhoek (00:00 UTC)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 MANAGEMENT FUNCTIONS:';
    RAISE NOTICE '   ✓ get_cron_job_status() - Check cron job status';
    RAISE NOTICE '   ✓ trigger_weekly_cycle_manual() - Manual testing';
    RAISE NOTICE '';
    RAISE NOTICE '🌍 TIMEZONE: All cron times are UTC. Windhoek is UTC+2';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ALL 4 STEPS COMPLETED! SYSTEM IS READY!';
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '📋 TESTING COMMANDS:';
    RAISE NOTICE '   SELECT get_cron_job_status();';
    RAISE NOTICE '   SELECT trigger_weekly_cycle_manual();';
    RAISE NOTICE '   SELECT get_exchange_status();';
    RAISE NOTICE '';
END $$;
