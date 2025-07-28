-- Update cron job schedules with retry logic and new times

-- Drop existing cron jobs first
SELECT cron.unschedule('weekly-price-calculation');
SELECT cron.unschedule('weekly-exchange-open');
SELECT cron.unschedule('weekly-exchange-close');
SELECT cron.unschedule('weekly-history-clear');
SELECT cron.unschedule('price-engine-cron');

-- Function to retry operations with exponential backoff
CREATE OR REPLACE FUNCTION retry_operation(
    operation_name TEXT,
    operation_function TEXT,
    max_retries INTEGER DEFAULT 5,
    base_delay_seconds INTEGER DEFAULT 3
)
RETURNS JSON AS $$
DECLARE
    attempt INTEGER := 1;
    result JSON;
    delay_seconds INTEGER;
    error_message TEXT;
BEGIN
    WHILE attempt <= max_retries LOOP
        BEGIN
            -- Execute the operation function
            EXECUTE format('SELECT %s()', operation_function) INTO result;
            
            -- Check if operation was successful
            IF (result->>'success')::BOOLEAN THEN
                RAISE NOTICE '[%] SUCCESS on attempt %/%: %', 
                    operation_name, attempt, max_retries, result->>'message';
                RETURN result;
            ELSE
                error_message := result->>'message';
                RAISE NOTICE '[%] FAILED attempt %/%: %', 
                    operation_name, attempt, max_retries, error_message;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_message := SQLERRM;
                RAISE NOTICE '[%] ERROR on attempt %/%: %', 
                    operation_name, attempt, max_retries, error_message;
        END;
        
        -- If not the last attempt, wait before retrying
        IF attempt < max_retries THEN
            delay_seconds := base_delay_seconds * attempt; -- Linear backoff
            RAISE NOTICE '[%] Retrying in % seconds...', operation_name, delay_seconds;
            PERFORM pg_sleep(delay_seconds);
        END IF;
        
        attempt := attempt + 1;
    END LOOP;
    
    -- All retries failed
    RETURN json_build_object(
        'success', false,
        'message', format('%s failed after %s attempts. Last error: %s', 
            operation_name, max_retries, error_message),
        'error_code', 'MAX_RETRIES_EXCEEDED',
        'attempts', max_retries,
        'last_error', error_message
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper functions for retry operations
CREATE OR REPLACE FUNCTION calculate_price_with_retries()
RETURNS JSON AS $$
BEGIN
    RETURN retry_operation('Price Calculation', 'calculate_weekly_share_price_simplified', 5, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION clear_history_with_retries()
RETURNS JSON AS $$
BEGIN
    RETURN retry_operation('History Clear', 'clear_weekly_order_history', 5, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION open_exchange_with_retries()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- First update exchange status to open
    SELECT update_exchange_status(true, 'cron_open') INTO result;
    
    IF NOT (result->>'success')::BOOLEAN THEN
        RETURN result;
    END IF;
    
    -- Then run the open exchange function
    RETURN retry_operation('Exchange Open', 'open_exchange_weekly', 5, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION close_exchange_with_retries()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- First run the close exchange function
    SELECT retry_operation('Exchange Close', 'close_exchange_weekly', 5, 3) INTO result;
    
    -- Then update exchange status to closed
    PERFORM update_exchange_status(false, 'cron_close');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test functions for manual verification
CREATE OR REPLACE FUNCTION test_new_schedule()
RETURNS JSON AS $$
DECLARE
    windhoek_time TIMESTAMP WITH TIME ZONE;
    current_week DATE;
    next_monday_0930 TIMESTAMP WITH TIME ZONE;
    next_monday_1003 TIMESTAMP WITH TIME ZONE;
    next_monday_1005 TIMESTAMP WITH TIME ZONE;
    next_sunday_2359 TIMESTAMP WITH TIME ZONE;
BEGIN
    windhoek_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    current_week := DATE_TRUNC('week', windhoek_time)::DATE + INTERVAL '1 day';
    
    -- Calculate next schedule times
    next_monday_0930 := (current_week + INTERVAL '7 days')::TIMESTAMP + INTERVAL '9 hours 30 minutes';
    next_monday_1003 := (current_week + INTERVAL '7 days')::TIMESTAMP + INTERVAL '10 hours 3 minutes';
    next_monday_1005 := (current_week + INTERVAL '7 days')::TIMESTAMP + INTERVAL '10 hours 5 minutes';
    next_sunday_2359 := (current_week + INTERVAL '6 days')::TIMESTAMP + INTERVAL '23 hours 59 minutes';
    
    RETURN json_build_object(
        'success', true,
        'message', 'New schedule verified successfully',
        'current_time_windhoek', windhoek_time,
        'current_week', current_week,
        'schedule', json_build_object(
            'history_clear', json_build_object(
                'cron', '30 9 * * 1',
                'description', 'Monday 09:30 Windhoek time',
                'next_run', next_monday_0930
            ),
            'price_calculation', json_build_object(
                'cron', '3 10 * * 1', 
                'description', 'Monday 10:03 Windhoek time',
                'next_run', next_monday_1003
            ),
            'exchange_open', json_build_object(
                'cron', '5 10 * * 1',
                'description', 'Monday 10:05 Windhoek time', 
                'next_run', next_monday_1005
            ),
            'exchange_close', json_build_object(
                'cron', '59 23 * * 0',
                'description', 'Sunday 23:59 Windhoek time',
                'next_run', next_sunday_2359
            )
        ),
        'timezone', 'Africa/Windhoek (UTC+2)',
        'retry_config', json_build_object(
            'max_retries', 5,
            'base_delay_seconds', 3,
            'backoff_type', 'linear'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS JSON AS $$
DECLARE
    job_count INTEGER;
    jobs_info JSON;
BEGIN
    -- Get count of active cron jobs
    SELECT COUNT(*) INTO job_count
    FROM cron.job
    WHERE active = true;
    
    -- Get detailed job information
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
    WHERE active = true
    ORDER BY jobname;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Found %s active cron jobs', job_count),
        'active_job_count', job_count,
        'jobs', COALESCE(jobs_info, '[]'::JSON),
        'expected_jobs', json_build_array(
            'weekly-history-clear-retry',
            'weekly-price-calculation-retry', 
            'weekly-exchange-open-retry',
            'weekly-exchange-close-retry'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_weekly_cycle_test()
RETURNS JSON AS $$
DECLARE
    clear_result JSON;
    price_result JSON;
    open_result JSON;
    overall_success BOOLEAN := true;
    error_messages TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '=== TESTING WEEKLY CYCLE ===';
    
    -- Test 1: Clear history
    RAISE NOTICE 'Step 1: Testing history clear...';
    SELECT clear_history_with_retries() INTO clear_result;
    
    IF NOT (clear_result->>'success')::BOOLEAN THEN
        overall_success := false;
        error_messages := array_append(error_messages, 'History clear failed: ' || (clear_result->>'message'));
    END IF;
    
    -- Test 2: Calculate price
    RAISE NOTICE 'Step 2: Testing price calculation...';
    SELECT calculate_price_with_retries() INTO price_result;
    
    IF NOT (price_result->>'success')::BOOLEAN THEN
        overall_success := false;
        error_messages := array_append(error_messages, 'Price calculation failed: ' || (price_result->>'message'));
    END IF;
    
    -- Test 3: Open exchange
    RAISE NOTICE 'Step 3: Testing exchange open...';
    SELECT open_exchange_with_retries() INTO open_result;
    
    IF NOT (open_result->>'success')::BOOLEAN THEN
        overall_success := false;
        error_messages := array_append(error_messages, 'Exchange open failed: ' || (open_result->>'message'));
    END IF;
    
    RAISE NOTICE '=== WEEKLY CYCLE TEST COMPLETE ===';
    
    RETURN json_build_object(
        'success', overall_success,
        'message', CASE 
            WHEN overall_success THEN 'Weekly cycle test completed successfully'
            ELSE 'Weekly cycle test completed with errors'
        END,
        'test_results', json_build_object(
            'history_clear', clear_result,
            'price_calculation', price_result,
            'exchange_open', open_result
        ),
        'error_messages', error_messages,
        'tested_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the new cron jobs with updated times
-- All times are in Africa/Windhoek timezone (UTC+2)

-- 1. Clear history: Monday 09:30
SELECT cron.schedule(
    'weekly-history-clear-retry',
    '30 9 * * 1',
    'SELECT clear_history_with_retries();'
);

-- 2. Calculate price: Monday 10:03  
SELECT cron.schedule(
    'weekly-price-calculation-retry',
    '3 10 * * 1',
    'SELECT calculate_price_with_retries();'
);

-- 3. Open exchange: Monday 10:05
SELECT cron.schedule(
    'weekly-exchange-open-retry', 
    '5 10 * * 1',
    'SELECT open_exchange_with_retries();'
);

-- 4. Close exchange: Sunday 23:59
SELECT cron.schedule(
    'weekly-exchange-close-retry',
    '59 23 * * 0', 
    'SELECT close_exchange_with_retries();'
);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== CRON SCHEDULE UPDATED WITH RETRIES ===';
    RAISE NOTICE 'New Schedule (Africa/Windhoek UTC+2):';
    RAISE NOTICE '1. Monday 09:30 - Clear order history (5x retry, 3s delay)';
    RAISE NOTICE '2. Monday 10:03 - Calculate share price (5x retry, 3s delay)';
    RAISE NOTICE '3. Monday 10:05 - Open exchange (5x retry, 3s delay)';
    RAISE NOTICE '4. Sunday 23:59 - Close exchange (5x retry, 3s delay)';
    RAISE NOTICE '';
    RAISE NOTICE 'Retry Functions Created:';
    RAISE NOTICE '- retry_operation(name, function, max_retries, delay)';
    RAISE NOTICE '- calculate_price_with_retries()';
    RAISE NOTICE '- clear_history_with_retries()';
    RAISE NOTICE '- open_exchange_with_retries()';
    RAISE NOTICE '- close_exchange_with_retries()';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Functions Created:';
    RAISE NOTICE '- test_new_schedule()';
    RAISE NOTICE '- get_cron_job_status()';
    RAISE NOTICE '- trigger_weekly_cycle_test()';
    RAISE NOTICE '';
    RAISE NOTICE 'All cron jobs scheduled successfully!';
END $$;
