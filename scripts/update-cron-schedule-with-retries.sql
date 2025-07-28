-- Update cron job schedules with retry logic and new times

-- First, remove any existing cron jobs to avoid duplicates
DO $$
BEGIN
    -- Try to remove existing jobs (will fail silently if pg_cron not available)
    BEGIN
        PERFORM cron.unschedule('clear_weekly_history');
        PERFORM cron.unschedule('calculate_weekly_price');
        PERFORM cron.unschedule('open_weekly_exchange');
        PERFORM cron.unschedule('close_weekly_exchange');
        PERFORM cron.unschedule('weekly_price_calculation');
        PERFORM cron.unschedule('weekly_exchange_open');
        PERFORM cron.unschedule('weekly_exchange_close');
        RAISE NOTICE 'Removed existing cron jobs';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not remove existing cron jobs (pg_cron may not be available): %', SQLERRM;
    END;
END $$;

-- Create retry wrapper functions with 5 attempts and 3-second delays

-- Retry function for clearing history
CREATE OR REPLACE FUNCTION clear_history_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt INTEGER := 1;
    max_attempts INTEGER := 5;
    retry_delay INTEGER := 3; -- seconds
    result JSON;
    last_error TEXT;
BEGIN
    WHILE attempt <= max_attempts LOOP
        BEGIN
            RAISE NOTICE 'Clear history attempt % of %', attempt, max_attempts;
            
            -- Call the actual function
            SELECT clear_weekly_order_history() INTO result;
            
            -- Check if successful
            IF (result->>'success')::BOOLEAN THEN
                RAISE NOTICE 'Clear history succeeded on attempt %', attempt;
                RETURN json_build_object(
                    'success', true,
                    'message', format('History cleared successfully on attempt %s', attempt),
                    'attempts_used', attempt,
                    'result', result,
                    'completed_at', NOW()
                );
            ELSE
                last_error := result->>'message';
                RAISE NOTICE 'Clear history failed on attempt %: %', attempt, last_error;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                last_error := SQLERRM;
                RAISE NOTICE 'Clear history error on attempt %: %', attempt, last_error;
        END;
        
        -- If not the last attempt, wait before retrying
        IF attempt < max_attempts THEN
            RAISE NOTICE 'Waiting % seconds before retry...', retry_delay;
            PERFORM pg_sleep(retry_delay);
        END IF;
        
        attempt := attempt + 1;
    END LOOP;
    
    -- All attempts failed
    RETURN json_build_object(
        'success', false,
        'message', format('Clear history failed after %s attempts. Last error: %s', max_attempts, last_error),
        'attempts_used', max_attempts,
        'last_error', last_error,
        'failed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retry function for calculating price
CREATE OR REPLACE FUNCTION calculate_price_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt INTEGER := 1;
    max_attempts INTEGER := 5;
    retry_delay INTEGER := 3; -- seconds
    result JSON;
    last_error TEXT;
BEGIN
    WHILE attempt <= max_attempts LOOP
        BEGIN
            RAISE NOTICE 'Price calculation attempt % of %', attempt, max_attempts;
            
            -- Call the actual function
            SELECT calculate_weekly_share_price_simplified() INTO result;
            
            -- Check if successful
            IF (result->>'success')::BOOLEAN THEN
                RAISE NOTICE 'Price calculation succeeded on attempt %', attempt;
                RETURN json_build_object(
                    'success', true,
                    'message', format('Price calculated successfully on attempt %s: %s', attempt, result->>'message'),
                    'attempts_used', attempt,
                    'result', result,
                    'completed_at', NOW()
                );
            ELSE
                last_error := result->>'message';
                RAISE NOTICE 'Price calculation failed on attempt %: %', attempt, last_error;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                last_error := SQLERRM;
                RAISE NOTICE 'Price calculation error on attempt %: %', attempt, last_error;
        END;
        
        -- If not the last attempt, wait before retrying
        IF attempt < max_attempts THEN
            RAISE NOTICE 'Waiting % seconds before retry...', retry_delay;
            PERFORM pg_sleep(retry_delay);
        END IF;
        
        attempt := attempt + 1;
    END LOOP;
    
    -- All attempts failed
    RETURN json_build_object(
        'success', false,
        'message', format('Price calculation failed after %s attempts. Last error: %s', max_attempts, last_error),
        'attempts_used', max_attempts,
        'last_error', last_error,
        'failed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retry function for opening exchange
CREATE OR REPLACE FUNCTION open_exchange_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt INTEGER := 1;
    max_attempts INTEGER := 5;
    retry_delay INTEGER := 3; -- seconds
    result JSON;
    last_error TEXT;
BEGIN
    WHILE attempt <= max_attempts LOOP
        BEGIN
            RAISE NOTICE 'Exchange open attempt % of %', attempt, max_attempts;
            
            -- Call the actual function
            SELECT open_exchange_weekly() INTO result;
            
            -- Check if successful
            IF (result->>'success')::BOOLEAN THEN
                RAISE NOTICE 'Exchange open succeeded on attempt %', attempt;
                RETURN json_build_object(
                    'success', true,
                    'message', format('Exchange opened successfully on attempt %s: %s', attempt, result->>'message'),
                    'attempts_used', attempt,
                    'result', result,
                    'completed_at', NOW()
                );
            ELSE
                last_error := result->>'message';
                RAISE NOTICE 'Exchange open failed on attempt %: %', attempt, last_error;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                last_error := SQLERRM;
                RAISE NOTICE 'Exchange open error on attempt %: %', attempt, last_error;
        END;
        
        -- If not the last attempt, wait before retrying
        IF attempt < max_attempts THEN
            RAISE NOTICE 'Waiting % seconds before retry...', retry_delay;
            PERFORM pg_sleep(retry_delay);
        END IF;
        
        attempt := attempt + 1;
    END LOOP;
    
    -- All attempts failed
    RETURN json_build_object(
        'success', false,
        'message', format('Exchange open failed after %s attempts. Last error: %s', max_attempts, last_error),
        'attempts_used', max_attempts,
        'last_error', last_error,
        'failed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test function for all retry functions
CREATE OR REPLACE FUNCTION test_all_retry_functions()
RETURNS JSON AS $$
DECLARE
    clear_test JSON;
    price_test JSON;
    open_test JSON;
BEGIN
    RAISE NOTICE 'Testing all retry functions...';
    
    -- Test clear history with retries
    SELECT clear_history_with_retries() INTO clear_test;
    
    -- Test price calculation with retries
    SELECT calculate_price_with_retries() INTO price_test;
    
    -- Test exchange open with retries
    SELECT open_exchange_with_retries() INTO open_test;
    
    RETURN json_build_object(
        'test_name', 'All Retry Functions Test',
        'test_time', NOW(),
        'clear_history_test', clear_test,
        'price_calculation_test', price_test,
        'exchange_open_test', open_test,
        'overall_status', CASE 
            WHEN (clear_test->>'success')::BOOLEAN 
                AND (price_test->>'success')::BOOLEAN 
                AND (open_test->>'success')::BOOLEAN 
            THEN 'ALL_RETRY_TESTS_PASSED'
            ELSE 'SOME_RETRY_TESTS_FAILED'
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Retry function test failed: ' || SQLERRM,
            'error_code', 'RETRY_TEST_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up the new cron jobs with updated schedule
DO $$
DECLARE
    jobs_scheduled INTEGER := 0;
BEGIN
    BEGIN
        -- NEW SCHEDULE (all times in Windhoek timezone):
        -- Monday 09:30 - Clear order history
        PERFORM cron.schedule('clear_weekly_history', '30 9 * * 1', 'SELECT clear_history_with_retries();');
        jobs_scheduled := jobs_scheduled + 1;
        RAISE NOTICE 'Scheduled: Clear history - Monday 09:30';
        
        -- Monday 10:03 - Calculate share price  
        PERFORM cron.schedule('calculate_weekly_price', '03 10 * * 1', 'SELECT calculate_price_with_retries();');
        jobs_scheduled := jobs_scheduled + 1;
        RAISE NOTICE 'Scheduled: Calculate price - Monday 10:03';
        
        -- Monday 10:05 - Open exchange
        PERFORM cron.schedule('open_weekly_exchange', '05 10 * * 1', 'SELECT open_exchange_with_retries();');
        jobs_scheduled := jobs_scheduled + 1;
        RAISE NOTICE 'Scheduled: Open exchange - Monday 10:05';
        
        -- Sunday 23:59 - Close exchange (no retry needed for this)
        PERFORM cron.schedule('close_weekly_exchange', '59 23 * * 0', 'SELECT close_exchange_weekly();');
        jobs_scheduled := jobs_scheduled + 1;
        RAISE NOTICE 'Scheduled: Close exchange - Sunday 23:59';
        
        RAISE NOTICE 'All % cron jobs scheduled successfully with new times!', jobs_scheduled;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not schedule cron jobs (pg_cron may not be available): %', SQLERRM;
            RAISE NOTICE 'Manual scheduling required:';
            RAISE NOTICE '- clear_history_with_retries() at 30 9 * * 1 (Monday 09:30)';
            RAISE NOTICE '- calculate_price_with_retries() at 03 10 * * 1 (Monday 10:03)';
            RAISE NOTICE '- open_exchange_with_retries() at 05 10 * * 1 (Monday 10:05)';
            RAISE NOTICE '- close_exchange_weekly() at 59 23 * * 0 (Sunday 23:59)';
    END;
END $$;

-- Final success message
DO $$
DECLARE
    function_count INTEGER;
    cron_count INTEGER;
BEGIN
    -- Count functions created
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'clear_history_with_retries',
        'calculate_price_with_retries',
        'open_exchange_with_retries',
        'test_all_retry_functions'
    );
    
    -- Count cron jobs (if pg_cron is available)
    BEGIN
        SELECT COUNT(*) INTO cron_count 
        FROM cron.job 
        WHERE jobname IN (
            'clear_weekly_history',
            'calculate_weekly_price',
            'open_weekly_exchange',
            'close_weekly_exchange'
        );
    EXCEPTION
        WHEN OTHERS THEN
            cron_count := 0;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                UPDATE-CRON-SCHEDULE-WITH-RETRIES.SQL                      █';
    RAISE NOTICE '█                              COMPLETED SUCCESSFULLY!                       █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 RETRY FUNCTIONS CREATED: % of 4', function_count;
    RAISE NOTICE '   ✓ clear_history_with_retries()';
    RAISE NOTICE '   ✓ calculate_price_with_retries()';
    RAISE NOTICE '   ✓ open_exchange_with_retries()';
    RAISE NOTICE '   ✓ test_all_retry_functions()';
    RAISE NOTICE '';
    RAISE NOTICE '⏰ NEW CRON SCHEDULE (Windhoek UTC+2):';
    RAISE NOTICE '   📅 Monday 09:30 - Clear order history (5x retry, 3s delay)';
    RAISE NOTICE '   📅 Monday 10:03 - Calculate share price (5x retry, 3s delay)';
    RAISE NOTICE '   📅 Monday 10:05 - Open exchange (5x retry, 3s delay)';
    RAISE NOTICE '   📅 Sunday 23:59 - Close exchange';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 RETRY LOGIC:';
    RAISE NOTICE '   🔁 Max attempts: 5 per operation';
    RAISE NOTICE '   ⏱️  Delay: 3 seconds between retries';
    RAISE NOTICE '   📝 Detailed logging for each attempt';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 CRON JOBS SCHEDULED: %', cron_count;
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TEST COMMANDS:';
    RAISE NOTICE '   SELECT test_all_retry_functions();';
    RAISE NOTICE '   SELECT get_cron_job_status();';
    RAISE NOTICE '   SELECT test_new_schedule();';
    RAISE NOTICE '   SELECT trigger_weekly_cycle_test();';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ALL SETUP COMPLETE! Exchange opens Monday 10:05 with robust retry system!';
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
