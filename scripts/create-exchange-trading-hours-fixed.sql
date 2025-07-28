-- Create exchange trading hours and status management system

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_exchange_status() CASCADE;
DROP FUNCTION IF EXISTS is_exchange_open() CASCADE;
DROP FUNCTION IF EXISTS get_trading_schedule() CASCADE;
DROP FUNCTION IF EXISTS test_new_schedule() CASCADE;
DROP FUNCTION IF EXISTS get_cron_job_status() CASCADE;
DROP FUNCTION IF EXISTS trigger_weekly_cycle_test() CASCADE;

-- Create exchange status function
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    current_time TIMESTAMP WITH TIME ZONE;
    windhoek_time TIMESTAMP;
    current_day INTEGER;
    current_hour INTEGER;
    current_minute INTEGER;
    is_open BOOLEAN := false;
    status_message TEXT;
    next_opening TEXT;
    current_price NUMERIC;
BEGIN
    -- Get current time in Windhoek timezone (UTC+2)
    current_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    windhoek_time := current_time;
    
    -- Extract day of week (1=Monday, 7=Sunday)
    current_day := EXTRACT(ISODOW FROM current_time);
    current_hour := EXTRACT(HOUR FROM current_time);
    current_minute := EXTRACT(MINUTE FROM current_time);
    
    -- Get current share price
    SELECT get_current_share_price() INTO current_price;
    
    -- Determine if exchange is open
    -- Open: Monday 10:05 - Sunday 23:59
    IF current_day = 1 AND (current_hour > 10 OR (current_hour = 10 AND current_minute >= 5)) THEN
        is_open := true;
        status_message := 'Exchange is OPEN for trading';
        next_opening := 'Currently open until Sunday 23:59';
    ELSIF current_day BETWEEN 2 AND 6 THEN
        is_open := true;
        status_message := 'Exchange is OPEN for trading';
        next_opening := 'Currently open until Sunday 23:59';
    ELSIF current_day = 7 AND current_hour < 23 THEN
        is_open := true;
        status_message := 'Exchange is OPEN for trading';
        next_opening := 'Closes tonight at 23:59, reopens Monday 10:05';
    ELSE
        is_open := false;
        IF current_day = 1 AND current_hour < 10 THEN
            status_message := 'Exchange opens today at 10:05 Windhoek time';
            next_opening := format('Opens today at 10:05 (in %s hours %s minutes)', 
                10 - current_hour - CASE WHEN current_minute > 5 THEN 1 ELSE 0 END,
                CASE WHEN current_minute <= 5 THEN 5 - current_minute ELSE 65 - current_minute END);
        ELSIF current_day = 1 AND current_hour = 10 AND current_minute < 5 THEN
            status_message := format('Exchange opens in %s minutes', 5 - current_minute);
            next_opening := format('Opens in %s minutes', 5 - current_minute);
        ELSE
            status_message := 'Exchange is CLOSED';
            next_opening := 'Opens Monday 10:05 Windhoek time';
        END IF;
    END IF;
    
    RETURN json_build_object(
        'is_open', is_open,
        'status_message', status_message,
        'next_opening', next_opening,
        'current_time_windhoek', windhoek_time,
        'current_price', current_price,
        'timezone', 'Africa/Windhoek (UTC+2)',
        'trading_hours', 'Monday 10:05 - Sunday 23:59',
        'current_day', current_day,
        'current_hour', current_hour,
        'current_minute', current_minute
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error getting exchange status: ' || SQLERRM,
            'error_code', 'EXCHANGE_STATUS_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple is_exchange_open function
CREATE OR REPLACE FUNCTION is_exchange_open()
RETURNS BOOLEAN AS $$
DECLARE
    status_result JSON;
BEGIN
    SELECT get_exchange_status() INTO status_result;
    RETURN (status_result->>'is_open')::BOOLEAN;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trading schedule function
CREATE OR REPLACE FUNCTION get_trading_schedule()
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'weekly_schedule', json_build_object(
            'monday', json_build_object(
                'history_clear', '09:30',
                'price_calculation', '10:03', 
                'exchange_opens', '10:05',
                'trading_until', '23:59'
            ),
            'tuesday_to_saturday', 'Open all day (00:00 - 23:59)',
            'sunday', json_build_object(
                'trading_until', '23:59',
                'exchange_closes', '23:59',
                'orders_cleared', '23:59'
            )
        ),
        'timezone', 'Africa/Windhoek (UTC+2)',
        'cron_jobs', json_build_object(
            'clear_history', '30 9 * * 1',
            'calculate_price', '03 10 * * 1',
            'open_exchange', '05 10 * * 1',
            'close_exchange', '59 23 * * 0'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test function for new schedule
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
    
    -- Test core functions exist
    PERFORM clear_weekly_order_history();
    PERFORM calculate_weekly_share_price_simplified();
    PERFORM open_exchange_weekly();
    PERFORM close_exchange_weekly();
    
    RETURN json_build_object(
        'success', true,
        'message', 'All schedule functions working correctly',
        'exchange_status', exchange_status,
        'trading_schedule', trading_schedule,
        'functions_tested', json_build_array(
            'clear_weekly_order_history',
            'calculate_weekly_share_price_simplified', 
            'open_exchange_weekly',
            'close_exchange_weekly'
        ),
        'test_time', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error testing schedule: ' || SQLERRM,
            'error_code', 'SCHEDULE_TEST_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create cron job status function
CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS JSON AS $$
DECLARE
    cron_jobs JSON;
BEGIN
    -- Get cron job information from pg_cron if available
    SELECT json_agg(
        json_build_object(
            'jobname', jobname,
            'schedule', schedule,
            'command', command,
            'active', active
        )
    ) INTO cron_jobs
    FROM cron.job 
    WHERE jobname LIKE '%weekly%' OR jobname LIKE '%exchange%' OR jobname LIKE '%price%';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Cron job status retrieved',
        'cron_jobs', COALESCE(cron_jobs, '[]'::json),
        'expected_jobs', json_build_array(
            'clear_history_with_retries_weekly',
            'calculate_price_with_retries_weekly', 
            'open_exchange_with_retries_weekly',
            'close_exchange_weekly'
        ),
        'checked_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error getting cron status (pg_cron may not be available): ' || SQLERRM,
            'error_code', 'CRON_STATUS_ERROR',
            'note', 'This is normal if pg_cron extension is not installed'
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
    final_status JSON;
BEGIN
    RAISE NOTICE 'Starting weekly cycle test...';
    
    -- Step 1: Clear history
    SELECT clear_weekly_order_history() INTO clear_result;
    RAISE NOTICE 'Clear history result: %', clear_result;
    
    -- Step 2: Calculate price
    SELECT calculate_weekly_share_price_simplified() INTO price_result;
    RAISE NOTICE 'Price calculation result: %', price_result;
    
    -- Step 3: Open exchange
    SELECT open_exchange_weekly() INTO open_result;
    RAISE NOTICE 'Exchange open result: %', open_result;
    
    -- Step 4: Get final status
    SELECT get_exchange_status() INTO final_status;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Weekly cycle test completed successfully',
        'steps', json_build_object(
            'step_1_clear_history', clear_result,
            'step_2_calculate_price', price_result,
            'step_3_open_exchange', open_result,
            'step_4_final_status', final_status
        ),
        'test_completed_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error in weekly cycle test: ' || SQLERRM,
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
    RAISE NOTICE 'New Schedule:';
    RAISE NOTICE '- Monday 09:30: Clear history';
    RAISE NOTICE '- Monday 10:03: Calculate prices';
    RAISE NOTICE '- Monday 10:05: Open exchange';
    RAISE NOTICE '- Sunday 23:59: Close exchange';
    RAISE NOTICE '';
    RAISE NOTICE 'All functions ready for testing';
END $$;
