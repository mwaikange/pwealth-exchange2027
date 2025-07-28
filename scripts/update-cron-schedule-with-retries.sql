-- Update cron job schedules with retry logic and new times

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing cron jobs to avoid conflicts
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE jobname IN (
    'weekly_price_calculation',
    'clear_weekly_history', 
    'open_exchange_weekly',
    'close_exchange_weekly',
    'calculate_price_with_retries_weekly',
    'clear_history_with_retries_weekly',
    'open_exchange_with_retries_weekly'
);

-- Create retry wrapper functions with proper error handling

-- 1. Clear history with retries (Monday 09:30)
CREATE OR REPLACE FUNCTION clear_history_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt INTEGER := 1;
    max_attempts INTEGER := 5;
    delay_seconds INTEGER := 3;
    result JSON;
    success BOOLEAN := false;
BEGIN
    WHILE attempt <= max_attempts AND NOT success LOOP
        BEGIN
            RAISE NOTICE 'Clear history attempt % of %', attempt, max_attempts;
            
            -- Call the actual function
            SELECT clear_weekly_order_history() INTO result;
            
            -- Check if successful
            IF (result->>'success')::BOOLEAN THEN
                success := true;
                RAISE NOTICE 'Clear history succeeded on attempt %', attempt;
            ELSE
                RAISE NOTICE 'Clear history failed on attempt %: %', attempt, result->>'message';
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Clear history attempt % failed with error: %', attempt, SQLERRM;
                result := json_build_object(
                    'success', false,
                    'message', 'Error on attempt ' || attempt || ': ' || SQLERRM,
                    'error_code', 'CLEAR_HISTORY_RETRY_ERROR'
                );
        END;
        
        -- If not successful and not last attempt, wait before retry
        IF NOT success AND attempt < max_attempts THEN
            RAISE NOTICE 'Waiting % seconds before retry...', delay_seconds;
            PERFORM pg_sleep(delay_seconds);
        END IF;
        
        attempt := attempt + 1;
    END LOOP;
    
    -- Return final result
    IF success THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Clear history completed successfully after ' || (attempt - 1) || ' attempts',
            'attempts_used', attempt - 1,
            'final_result', result
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', 'Clear history failed after ' || max_attempts || ' attempts',
            'attempts_used', max_attempts,
            'final_result', result
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Calculate price with retries (Monday 10:03)
CREATE OR REPLACE FUNCTION calculate_price_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt INTEGER := 1;
    max_attempts INTEGER := 5;
    delay_seconds INTEGER := 3;
    result JSON;
    success BOOLEAN := false;
BEGIN
    WHILE attempt <= max_attempts AND NOT success LOOP
        BEGIN
            RAISE NOTICE 'Price calculation attempt % of %', attempt, max_attempts;
            
            -- Call the actual function
            SELECT calculate_weekly_share_price_simplified() INTO result;
            
            -- Check if successful
            IF (result->>'success')::BOOLEAN THEN
                success := true;
                RAISE NOTICE 'Price calculation succeeded on attempt %', attempt;
            ELSE
                RAISE NOTICE 'Price calculation failed on attempt %: %', attempt, result->>'message';
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Price calculation attempt % failed with error: %', attempt, SQLERRM;
                result := json_build_object(
                    'success', false,
                    'message', 'Error on attempt ' || attempt || ': ' || SQLERRM,
                    'error_code', 'PRICE_CALC_RETRY_ERROR'
                );
        END;
        
        -- If not successful and not last attempt, wait before retry
        IF NOT success AND attempt < max_attempts THEN
            RAISE NOTICE 'Waiting % seconds before retry...', delay_seconds;
            PERFORM pg_sleep(delay_seconds);
        END IF;
        
        attempt := attempt + 1;
    END LOOP;
    
    -- Return final result
    IF success THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Price calculation completed successfully after ' || (attempt - 1) || ' attempts',
            'attempts_used', attempt - 1,
            'final_result', result
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', 'Price calculation failed after ' || max_attempts || ' attempts',
            'attempts_used', max_attempts,
            'final_result', result
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Open exchange with retries (Monday 10:05)
CREATE OR REPLACE FUNCTION open_exchange_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt INTEGER := 1;
    max_attempts INTEGER := 5;
    delay_seconds INTEGER := 3;
    result JSON;
    success BOOLEAN := false;
BEGIN
    WHILE attempt <= max_attempts AND NOT success LOOP
        BEGIN
            RAISE NOTICE 'Exchange open attempt % of %', attempt, max_attempts;
            
            -- Call the actual function
            SELECT open_exchange_weekly() INTO result;
            
            -- Check if successful
            IF (result->>'success')::BOOLEAN THEN
                success := true;
                RAISE NOTICE 'Exchange open succeeded on attempt %', attempt;
            ELSE
                RAISE NOTICE 'Exchange open failed on attempt %: %', attempt, result->>'message';
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Exchange open attempt % failed with error: %', attempt, SQLERRM;
                result := json_build_object(
                    'success', false,
                    'message', 'Error on attempt ' || attempt || ': ' || SQLERRM,
                    'error_code', 'EXCHANGE_OPEN_RETRY_ERROR'
                );
        END;
        
        -- If not successful and not last attempt, wait before retry
        IF NOT success AND attempt < max_attempts THEN
            RAISE NOTICE 'Waiting % seconds before retry...', delay_seconds;
            PERFORM pg_sleep(delay_seconds);
        END IF;
        
        attempt := attempt + 1;
    END LOOP;
    
    -- Return final result
    IF success THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Exchange open completed successfully after ' || (attempt - 1) || ' attempts',
            'attempts_used', attempt - 1,
            'final_result', result
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', 'Exchange open failed after ' || max_attempts || ' attempts',
            'attempts_used', max_attempts,
            'final_result', result
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the new cron jobs with updated times

-- 1. Clear history every Monday at 09:30 Windhoek time (07:30 UTC)
SELECT cron.schedule(
    'clear_history_with_retries_weekly',
    '30 7 * * 1',  -- 07:30 UTC = 09:30 Windhoek time (UTC+2)
    'SELECT clear_history_with_retries();'
);

-- 2. Calculate price every Monday at 10:03 Windhoek time (08:03 UTC)  
SELECT cron.schedule(
    'calculate_price_with_retries_weekly',
    '03 8 * * 1',  -- 08:03 UTC = 10:03 Windhoek time (UTC+2)
    'SELECT calculate_price_with_retries();'
);

-- 3. Open exchange every Monday at 10:05 Windhoek time (08:05 UTC)
SELECT cron.schedule(
    'open_exchange_with_retries_weekly', 
    '05 8 * * 1',  -- 08:05 UTC = 10:05 Windhoek time (UTC+2)
    'SELECT open_exchange_with_retries();'
);

-- 4. Close exchange every Sunday at 23:59 Windhoek time (21:59 UTC)
SELECT cron.schedule(
    'close_exchange_weekly',
    '59 21 * * 0',  -- 21:59 UTC = 23:59 Windhoek time (UTC+2)
    'SELECT close_exchange_weekly();'
);

-- Create a function to check all cron jobs are properly scheduled
CREATE OR REPLACE FUNCTION verify_cron_schedule()
RETURNS JSON AS $$
DECLARE
    job_count INTEGER;
    jobs JSON;
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
    
    -- Get job details
    SELECT json_agg(
        json_build_object(
            'jobname', jobname,
            'schedule', schedule,
            'command', command,
            'active', active
        )
    ) INTO jobs
    FROM cron.job 
    WHERE jobname IN (
        'clear_history_with_retries_weekly',
        'calculate_price_with_retries_weekly',
        'open_exchange_with_retries_weekly',
        'close_exchange_weekly'
    );
    
    RETURN json_build_object(
        'success', job_count = 4,
        'message', CASE 
            WHEN job_count = 4 THEN 'All 4 cron jobs scheduled correctly'
            ELSE 'Only ' || job_count || ' of 4 cron jobs found'
        END,
        'jobs_found', job_count,
        'expected_jobs', 4,
        'job_details', jobs,
        'schedule_summary', json_build_object(
            'clear_history', 'Monday 09:30 Windhoek (07:30 UTC)',
            'calculate_price', 'Monday 10:03 Windhoek (08:03 UTC)',
            'open_exchange', 'Monday 10:05 Windhoek (08:05 UTC)', 
            'close_exchange', 'Sunday 23:59 Windhoek (21:59 UTC)'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log completion and verify setup
DO $$
DECLARE
    verification_result JSON;
BEGIN
    RAISE NOTICE '=== CRON SCHEDULE UPDATE COMPLETE ===';
    RAISE NOTICE '';
    RAISE NOTICE 'New Schedule (Windhoek Time UTC+2):';
    RAISE NOTICE '- Monday 09:30: Clear order history (with 5x retry)';
    RAISE NOTICE '- Monday 10:03: Calculate share price (with 5x retry)';
    RAISE NOTICE '- Monday 10:05: Open exchange (with 5x retry)';
    RAISE NOTICE '- Sunday 23:59: Close exchange';
    RAISE NOTICE '';
    RAISE NOTICE 'Retry Logic: Each job tries up to 5 times with 3-second delays';
    RAISE NOTICE '';
    
    -- Verify the setup
    SELECT verify_cron_schedule() INTO verification_result;
    RAISE NOTICE 'Verification Result: %', verification_result;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Setup complete! Test with:';
    RAISE NOTICE '- SELECT test_new_schedule();';
    RAISE NOTICE '- SELECT get_exchange_status();';
    RAISE NOTICE '- SELECT verify_cron_schedule();';
END $$;
