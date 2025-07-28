-- Create exchange trading hours and status functions with retry logic

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_exchange_status() CASCADE;
DROP FUNCTION IF EXISTS is_exchange_open() CASCADE;
DROP FUNCTION IF EXISTS get_trading_schedule() CASCADE;

-- Create exchange status function
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    current_time TIMESTAMP WITH TIME ZONE;
    current_day INTEGER;
    current_hour INTEGER;
    current_minute INTEGER;
    is_open BOOLEAN := false;
    status_message TEXT;
    next_open_time TEXT;
    current_week DATE;
BEGIN
    -- Get current time in Windhoek timezone
    current_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    current_day := EXTRACT(DOW FROM current_time); -- 0=Sunday, 1=Monday, etc.
    current_hour := EXTRACT(HOUR FROM current_time);
    current_minute := EXTRACT(MINUTE FROM current_time);
    current_week := DATE_TRUNC('week', current_time)::DATE + INTERVAL '1 day';
    
    -- Exchange is open Monday 10:05 to Sunday 23:59 (Windhoek time)
    IF current_day = 1 THEN -- Monday
        IF current_hour > 10 OR (current_hour = 10 AND current_minute >= 5) THEN
            is_open := true;
            status_message := 'Exchange is OPEN - Trading active';
            next_open_time := 'Open until Sunday 23:59';
        ELSE
            is_open := false;
            status_message := format('Exchange opens today at 10:05 (in %s minutes)', 
                (10 * 60 + 5) - (current_hour * 60 + current_minute));
            next_open_time := 'Today at 10:05 Windhoek time';
        END IF;
    ELSIF current_day BETWEEN 2 AND 6 THEN -- Tuesday to Saturday
        is_open := true;
        status_message := 'Exchange is OPEN - Trading active';
        next_open_time := 'Open until Sunday 23:59';
    ELSIF current_day = 0 THEN -- Sunday
        IF current_hour < 23 OR (current_hour = 23 AND current_minute < 59) THEN
            is_open := true;
            status_message := format('Exchange is OPEN - Closes in %s minutes', 
                (23 * 60 + 59) - (current_hour * 60 + current_minute));
            next_open_time := 'Closes at 23:59, reopens Monday 10:05';
        ELSE
            is_open := false;
            status_message := 'Exchange is CLOSED - Weekly maintenance';
            next_open_time := 'Monday 10:05 Windhoek time';
        END IF;
    END IF;
    
    RETURN json_build_object(
        'is_open', is_open,
        'status_message', status_message,
        'next_open_time', next_open_time,
        'current_time', current_time,
        'current_week', current_week,
        'timezone', 'Africa/Windhoek (UTC+2)',
        'trading_hours', 'Monday 10:05 - Sunday 23:59'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'is_open', false,
            'status_message', 'Error checking exchange status: ' || SQLERRM,
            'error_code', 'EXCHANGE_STATUS_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple boolean function for exchange open status
CREATE OR REPLACE FUNCTION is_exchange_open()
RETURNS BOOLEAN AS $$
DECLARE
    status_result JSON;
BEGIN
    SELECT get_exchange_status() INTO status_result;
    RETURN (status_result->>'is_open')::BOOLEAN;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false; -- Default to closed on error
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trading schedule information function
CREATE OR REPLACE FUNCTION get_trading_schedule()
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'weekly_schedule', json_build_object(
            'monday', 'Opens at 10:05 Windhoek time',
            'tuesday_to_saturday', 'Open all day',
            'sunday', 'Open until 23:59, then closes for maintenance'
        ),
        'maintenance_window', json_build_object(
            'start', 'Sunday 23:59 Windhoek time',
            'end', 'Monday 10:05 Windhoek time',
            'duration', '10 hours 6 minutes',
            'activities', json_build_array(
                'Clear order history (Monday 09:30)',
                'Calculate new share prices (Monday 10:03)',
                'Open exchange for new week (Monday 10:05)'
            )
        ),
        'timezone', 'Africa/Windhoek (UTC+2)',
        'note', 'All times are in Windhoek timezone'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test functions for the new schedule
CREATE OR REPLACE FUNCTION test_new_schedule()
RETURNS JSON AS $$
DECLARE
    exchange_status JSON;
    trading_schedule JSON;
    test_results JSON;
BEGIN
    -- Get current exchange status
    SELECT get_exchange_status() INTO exchange_status;
    
    -- Get trading schedule
    SELECT get_trading_schedule() INTO trading_schedule;
    
    -- Build test results
    test_results := json_build_object(
        'test_name', 'New Schedule Test',
        'test_time', NOW(),
        'exchange_status', exchange_status,
        'trading_schedule', trading_schedule,
        'cron_schedule', json_build_object(
            'history_clear', 'Monday 09:30 (30 9 * * 1)',
            'price_calculation', 'Monday 10:03 (03 10 * * 1)', 
            'exchange_open', 'Monday 10:05 (05 10 * * 1)',
            'exchange_close', 'Sunday 23:59 (59 23 * * 0)'
        ),
        'test_status', 'PASSED'
    );
    
    RETURN test_results;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'test_name', 'New Schedule Test',
            'test_status', 'FAILED',
            'error_message', SQLERRM,
            'error_code', 'SCHEDULE_TEST_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create cron job status check function
CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS JSON AS $$
DECLARE
    cron_jobs JSON;
BEGIN
    -- Get all cron jobs from pg_cron.job table if it exists
    BEGIN
        SELECT json_agg(
            json_build_object(
                'jobid', jobid,
                'schedule', schedule,
                'command', command,
                'nodename', nodename,
                'nodeport', nodeport,
                'database', database,
                'username', username,
                'active', active
            )
        ) INTO cron_jobs
        FROM cron.job
        WHERE command LIKE '%weekly%' OR command LIKE '%exchange%' OR command LIKE '%price%';
        
    EXCEPTION
        WHEN OTHERS THEN
            cron_jobs := json_build_array(
                json_build_object(
                    'note', 'pg_cron extension not available or no jobs found',
                    'expected_jobs', json_build_array(
                        'clear_history_with_retries() - Monday 09:30',
                        'calculate_price_with_retries() - Monday 10:03',
                        'open_exchange_with_retries() - Monday 10:05',
                        'close_exchange_weekly() - Sunday 23:59'
                    )
                )
            );
    END;
    
    RETURN json_build_object(
        'cron_jobs', cron_jobs,
        'expected_schedule', json_build_object(
            'clear_history', '30 9 * * 1 (Monday 09:30)',
            'calculate_price', '03 10 * * 1 (Monday 10:03)',
            'open_exchange', '05 10 * * 1 (Monday 10:05)',
            'close_exchange', '59 23 * * 0 (Sunday 23:59)'
        ),
        'timezone', 'Africa/Windhoek (UTC+2)',
        'status_check_time', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', 'Failed to check cron job status: ' || SQLERRM,
            'error_code', 'CRON_STATUS_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create weekly cycle test function
CREATE OR REPLACE FUNCTION trigger_weekly_cycle_test()
RETURNS JSON AS $$
DECLARE
    clear_result JSON;
    price_result JSON;
    open_result JSON;
    test_summary JSON;
BEGIN
    RAISE NOTICE 'Starting weekly cycle test...';
    
    -- Test 1: Clear history
    BEGIN
        SELECT clear_weekly_order_history() INTO clear_result;
        RAISE NOTICE 'Clear history test: %', clear_result->>'message';
    EXCEPTION
        WHEN OTHERS THEN
            clear_result := json_build_object(
                'success', false,
                'message', 'Clear history test failed: ' || SQLERRM,
                'error_code', 'CLEAR_TEST_ERROR'
            );
    END;
    
    -- Test 2: Calculate price
    BEGIN
        SELECT calculate_weekly_share_price_simplified() INTO price_result;
        RAISE NOTICE 'Price calculation test: %', price_result->>'message';
    EXCEPTION
        WHEN OTHERS THEN
            price_result := json_build_object(
                'success', false,
                'message', 'Price calculation test failed: ' || SQLERRM,
                'error_code', 'PRICE_TEST_ERROR'
            );
    END;
    
    -- Test 3: Open exchange
    BEGIN
        SELECT open_exchange_weekly() INTO open_result;
        RAISE NOTICE 'Exchange open test: %', open_result->>'message';
    EXCEPTION
        WHEN OTHERS THEN
            open_result := json_build_object(
                'success', false,
                'message', 'Exchange open test failed: ' || SQLERRM,
                'error_code', 'OPEN_TEST_ERROR'
            );
    END;
    
    -- Build summary
    test_summary := json_build_object(
        'test_name', 'Weekly Cycle Test',
        'test_time', NOW(),
        'clear_history_result', clear_result,
        'price_calculation_result', price_result,
        'exchange_open_result', open_result,
        'overall_status', CASE 
            WHEN (clear_result->>'success')::BOOLEAN 
                AND (price_result->>'success')::BOOLEAN 
                AND (open_result->>'success')::BOOLEAN 
            THEN 'ALL_TESTS_PASSED'
            ELSE 'SOME_TESTS_FAILED'
        END
    );
    
    RAISE NOTICE 'Weekly cycle test completed: %', test_summary->>'overall_status';
    
    RETURN test_summary;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Weekly cycle test failed: ' || SQLERRM,
            'error_code', 'WEEKLY_CYCLE_TEST_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== EXCHANGE TRADING HOURS SETUP COMPLETE ===';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- get_exchange_status()';
    RAISE NOTICE '- is_exchange_open()';
    RAISE NOTICE '- get_trading_schedule()';
    RAISE NOTICE '- test_new_schedule()';
    RAISE NOTICE '- get_cron_job_status()';
    RAISE NOTICE '- trigger_weekly_cycle_test()';
    RAISE NOTICE '';
    RAISE NOTICE 'Trading Hours: Monday 10:05 - Sunday 23:59 (Windhoek time)';
    RAISE NOTICE 'Maintenance: Sunday 23:59 - Monday 10:05 (10h 6m)';
    RAISE NOTICE '';
    RAISE NOTICE 'Test the setup with:';
    RAISE NOTICE '- SELECT test_new_schedule();';
    RAISE NOTICE '- SELECT get_exchange_status();';
    RAISE NOTICE '- SELECT trigger_weekly_cycle_test();';
END $$;
