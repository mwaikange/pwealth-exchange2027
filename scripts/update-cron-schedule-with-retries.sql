-- Update cron job schedules with retry logic and new times

-- First, remove any existing weekly cron jobs to avoid duplicates
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE jobname IN (
    'clear_history_weekly',
    'calculate_price_weekly', 
    'open_exchange_weekly',
    'close_exchange_weekly',
    'clear_history_with_retries_weekly',
    'calculate_price_with_retries_weekly',
    'open_exchange_with_retries_weekly'
);

-- Create retry wrapper functions with 5 attempts and 3-second delays

-- Retry wrapper for clearing history
CREATE OR REPLACE FUNCTION clear_history_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt INTEGER := 1;
    max_attempts INTEGER := 5;
    delay_seconds INTEGER := 3;
    result JSON;
    last_error TEXT;
BEGIN
    WHILE attempt <= max_attempts LOOP
        BEGIN
            RAISE NOTICE 'Clear history attempt % of %', attempt, max_attempts;
            
            SELECT clear_weekly_order_history() INTO result;
            
            -- Check if successful
            IF (result->>'success')::BOOLEAN THEN
                RETURN json_build_object(
                    'success', true,
                    'message', format('History cleared successfully on attempt %s', attempt),
                    'attempts_used', attempt,
                    'result', result
                );
            ELSE
                last_error := result->>'message';
                RAISE EXCEPTION 'Function returned failure: %', last_error;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                last_error := SQLERRM;
                RAISE NOTICE 'Clear history attempt % failed: %', attempt, last_error;
                
                IF attempt = max_attempts THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', format('Failed after %s attempts. Last error: %s', max_attempts, last_error),
                        'attempts_used', attempt,
                        'error_code', 'CLEAR_HISTORY_RETRY_FAILED'
                    );
                END IF;
                
                -- Wait before retry
                PERFORM pg_sleep(delay_seconds);
                attempt := attempt + 1;
        END;
    END LOOP;
    
    -- Should never reach here, but just in case
    RETURN json_build_object(
        'success', false,
        'message', 'Unexpected end of retry loop',
        'error_code', 'RETRY_LOOP_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retry wrapper for price calculation
CREATE OR REPLACE FUNCTION calculate_price_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt INTEGER := 1;
    max_attempts INTEGER := 5;
    delay_seconds INTEGER := 3;
    result JSON;
    last_error TEXT;
BEGIN
    WHILE attempt <= max_attempts LOOP
        BEGIN
            RAISE NOTICE 'Price calculation attempt % of %', attempt, max_attempts;
            
            SELECT calculate_weekly_share_price_simplified() INTO result;
            
            -- Check if successful
            IF (result->>'success')::BOOLEAN THEN
                RETURN json_build_object(
                    'success', true,
                    'message', format('Price calculated successfully on attempt %s', attempt),
                    'attempts_used', attempt,
                    'result', result
                );
            ELSE
                last_error := result->>'message';
                RAISE EXCEPTION 'Function returned failure: %', last_error;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                last_error := SQLERRM;
                RAISE NOTICE 'Price calculation attempt % failed: %', attempt, last_error;
                
                IF attempt = max_attempts THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', format('Failed after %s attempts. Last error: %s', max_attempts, last_error),
                        'attempts_used', attempt,
                        'error_code', 'PRICE_CALCULATION_RETRY_FAILED'
                    );
                END IF;
                
                -- Wait before retry
                PERFORM pg_sleep(delay_seconds);
                attempt := attempt + 1;
        END;
    END LOOP;
    
    -- Should never reach here, but just in case
    RETURN json_build_object(
        'success', false,
        'message', 'Unexpected end of retry loop',
        'error_code', 'RETRY_LOOP_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retry wrapper for opening exchange
CREATE OR REPLACE FUNCTION open_exchange_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt INTEGER := 1;
    max_attempts INTEGER := 5;
    delay_seconds INTEGER := 3;
    result JSON;
    last_error TEXT;
BEGIN
    WHILE attempt <= max_attempts LOOP
        BEGIN
            RAISE NOTICE 'Exchange opening attempt % of %', attempt, max_attempts;
            
            SELECT open_exchange_weekly() INTO result;
            
            -- Check if successful
            IF (result->>'success')::BOOLEAN THEN
                RETURN json_build_object(
                    'success', true,
                    'message', format('Exchange opened successfully on attempt %s', attempt),
                    'attempts_used', attempt,
                    'result', result
                );
            ELSE
                last_error := result->>'message';
                RAISE EXCEPTION 'Function returned failure: %', last_error;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                last_error := SQLERRM;
                RAISE NOTICE 'Exchange opening attempt % failed: %', attempt, last_error;
                
                IF attempt = max_attempts THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', format('Failed after %s attempts. Last error: %s', max_attempts, last_error),
                        'attempts_used', attempt,
                        'error_code', 'EXCHANGE_OPEN_RETRY_FAILED'
                    );
                END IF;
                
                -- Wait before retry
                PERFORM pg_sleep(delay_seconds);
                attempt := attempt + 1;
        END;
    END LOOP;
    
    -- Should never reach here, but just in case
    RETURN json_build_object(
        'success', false,
        'message', 'Unexpected end of retry loop',
        'error_code', 'RETRY_LOOP_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the new cron jobs with updated times (Africa/Windhoek timezone)

-- 1. Clear order history - Monday 09:30 Windhoek time
SELECT cron.schedule(
    'clear_history_with_retries_weekly',
    '30 9 * * 1',  -- Monday 09:30
    'SELECT clear_history_with_retries();'
);

-- 2. Calculate share price - Monday 10:03 Windhoek time  
SELECT cron.schedule(
    'calculate_price_with_retries_weekly',
    '3 10 * * 1',  -- Monday 10:03
    'SELECT calculate_price_with_retries();'
);

-- 3. Open exchange - Monday 10:05 Windhoek time
SELECT cron.schedule(
    'open_exchange_with_retries_weekly', 
    '5 10 * * 1',  -- Monday 10:05
    'SELECT open_exchange_with_retries();'
);

-- 4. Close exchange - Sunday 23:59 Windhoek time (no retry needed for close)
SELECT cron.schedule(
    'close_exchange_weekly',
    '59 23 * * 0', -- Sunday 23:59
    'SELECT close_exchange_weekly();'
);

-- Create a function to manually test all retry functions
CREATE OR REPLACE FUNCTION test_all_retry_functions()
RETURNS JSON AS $$
DECLARE
    clear_result JSON;
    price_result JSON;
    open_result JSON;
    all_success BOOLEAN := true;
BEGIN
    RAISE NOTICE '=== TESTING ALL RETRY FUNCTIONS ===';
    
    -- Test clear history with retries
    RAISE NOTICE 'Testing clear_history_with_retries()...';
    SELECT clear_history_with_retries() INTO clear_result;
    IF NOT (clear_result->>'success')::BOOLEAN THEN
        all_success := false;
    END IF;
    
    -- Test price calculation with retries
    RAISE NOTICE 'Testing calculate_price_with_retries()...';
    SELECT calculate_price_with_retries() INTO price_result;
    IF NOT (price_result->>'success')::BOOLEAN THEN
        all_success := false;
    END IF;
    
    -- Test exchange opening with retries
    RAISE NOTICE 'Testing open_exchange_with_retries()...';
    SELECT open_exchange_with_retries() INTO open_result;
    IF NOT (open_result->>'success')::BOOLEAN THEN
        all_success := false;
    END IF;
    
    RETURN json_build_object(
        'success', all_success,
        'message', CASE 
            WHEN all_success THEN 'All retry functions tested successfully'
            ELSE 'Some retry functions failed - check logs'
        END,
        'results', json_build_object(
            'clear_history', clear_result,
            'calculate_price', price_result,
            'open_exchange', open_result
        ),
        'tested_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error testing retry functions: ' || SQLERRM,
            'error_code', 'RETRY_TEST_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log the completion and show the new schedule
DO $$
DECLARE
    job_count INTEGER;
BEGIN
    -- Count scheduled jobs
    SELECT COUNT(*) INTO job_count 
    FROM cron.job 
    WHERE jobname IN (
        'clear_history_with_retries_weekly',
        'calculate_price_with_retries_weekly',
        'open_exchange_with_retries_weekly',
        'close_exchange_weekly'
    );
    
    RAISE NOTICE '=== CRON SCHEDULE UPDATED WITH RETRIES ===';
    RAISE NOTICE 'Scheduled % jobs successfully', job_count;
    RAISE NOTICE '';
    RAISE NOTICE 'NEW SCHEDULE (Africa/Windhoek UTC+2):';
    RAISE NOTICE '1. Monday 09:30 - Clear order history (5x retry, 3s delay)';
    RAISE NOTICE '2. Monday 10:03 - Calculate share price (5x retry, 3s delay)';
    RAISE NOTICE '3. Monday 10:05 - Open exchange (5x retry, 3s delay)';
    RAISE NOTICE '4. Sunday 23:59 - Close exchange (no retry needed)';
    RAISE NOTICE '';
    RAISE NOTICE 'RETRY FUNCTIONS CREATED:';
    RAISE NOTICE '- clear_history_with_retries()';
    RAISE NOTICE '- calculate_price_with_retries()';
    RAISE NOTICE '- open_exchange_with_retries()';
    RAISE NOTICE '- test_all_retry_functions()';
    RAISE NOTICE '';
    RAISE NOTICE 'KEY IMPROVEMENTS:';
    RAISE NOTICE '- Uses JSE200 percent_change column directly';
    RAISE NOTICE '- Proper base_price -> final_price calculation';
    RAISE NOTICE '- Chronological execution with delays';
    RAISE NOTICE '- Robust error handling and retries';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to test! Run: SELECT test_all_retry_functions();';
END $$;
