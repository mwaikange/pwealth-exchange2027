-- Update all cron jobs to new schedule with retry logic
-- Monday schedule:
-- 09:30 - Clear order history
-- 10:03 - Calculate new share price (with retries)
-- 10:05 - Open exchange

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove ALL existing weekly cron jobs to avoid duplicates
SELECT cron.unschedule('weekly-exchange-close');
SELECT cron.unschedule('weekly-exchange-open');
SELECT cron.unschedule('weekly-history-clear');
SELECT cron.unschedule('weekly-price-calculation');
SELECT cron.unschedule('weekly-price-calculation-simplified');
SELECT cron.unschedule('weekly-share-price-calculation');
SELECT cron.unschedule('weekly-share-price-simplified');

-- Create enhanced functions with retry logic
CREATE OR REPLACE FUNCTION calculate_price_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 5;
    result JSON;
    success BOOLEAN := false;
    error_msg TEXT;
BEGIN
    WHILE attempt_count < max_attempts AND NOT success LOOP
        BEGIN
            attempt_count := attempt_count + 1;
            
            -- Log attempt
            RAISE NOTICE 'Price calculation attempt % of %', attempt_count, max_attempts;
            
            -- Try to calculate the price
            SELECT calculate_weekly_share_price_simplified() INTO result;
            
            -- Check if successful (handle both boolean and text responses)
            IF result IS NOT NULL AND (
                (result->>'success')::boolean = true OR
                result->>'success' = 'true'
            ) THEN
                success := true;
                RAISE NOTICE 'Price calculation successful on attempt %', attempt_count;
            ELSE
                error_msg := COALESCE(result->>'message', 'Unknown error');
                RAISE NOTICE 'Price calculation failed on attempt %: %', attempt_count, error_msg;
                
                -- Wait 3 seconds before retry (except on last attempt)
                IF attempt_count < max_attempts THEN
                    PERFORM pg_sleep(3);
                END IF;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_msg := SQLERRM;
                RAISE NOTICE 'Price calculation error on attempt %: %', attempt_count, error_msg;
                
                -- Wait 3 seconds before retry (except on last attempt)
                IF attempt_count < max_attempts THEN
                    PERFORM pg_sleep(3);
                END IF;
        END;
    END LOOP;
    
    IF success THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Price calculation completed successfully',
            'attempts', attempt_count,
            'data', result
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', 'Price calculation failed after ' || max_attempts || ' attempts. Last error: ' || COALESCE(error_msg, 'Unknown error'),
            'attempts', attempt_count,
            'last_error', error_msg
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION clear_history_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 5;
    result JSON;
    success BOOLEAN := false;
    error_msg TEXT;
BEGIN
    WHILE attempt_count < max_attempts AND NOT success LOOP
        BEGIN
            attempt_count := attempt_count + 1;
            
            -- Log attempt
            RAISE NOTICE 'History clear attempt % of %', attempt_count, max_attempts;
            
            -- Try to clear history
            SELECT clear_weekly_order_history() INTO result;
            
            -- Check if successful
            IF result IS NOT NULL AND (
                (result->>'success')::boolean = true OR
                result->>'success' = 'true'
            ) THEN
                success := true;
                RAISE NOTICE 'History clear successful on attempt %', attempt_count;
            ELSE
                error_msg := COALESCE(result->>'message', 'Unknown error');
                RAISE NOTICE 'History clear failed on attempt %: %', attempt_count, error_msg;
                
                -- Wait 3 seconds before retry (except on last attempt)
                IF attempt_count < max_attempts THEN
                    PERFORM pg_sleep(3);
                END IF;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_msg := SQLERRM;
                RAISE NOTICE 'History clear error on attempt %: %', attempt_count, error_msg;
                
                -- Wait 3 seconds before retry (except on last attempt)
                IF attempt_count < max_attempts THEN
                    PERFORM pg_sleep(3);
                END IF;
        END;
    END LOOP;
    
    IF success THEN
        RETURN json_build_object(
            'success', true,
            'message', 'History clear completed successfully',
            'attempts', attempt_count,
            'data', result
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', 'History clear failed after ' || max_attempts || ' attempts. Last error: ' || COALESCE(error_msg, 'Unknown error'),
            'attempts', attempt_count,
            'last_error', error_msg
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION open_exchange_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 5;
    result JSON;
    success BOOLEAN := false;
    error_msg TEXT;
BEGIN
    WHILE attempt_count < max_attempts AND NOT success LOOP
        BEGIN
            attempt_count := attempt_count + 1;
            
            -- Log attempt
            RAISE NOTICE 'Exchange open attempt % of %', attempt_count, max_attempts;
            
            -- Try to open exchange
            SELECT open_exchange_weekly() INTO result;
            
            -- Check if successful
            IF result IS NOT NULL AND (
                (result->>'success')::boolean = true OR
                result->>'success' = 'true'
            ) THEN
                success := true;
                RAISE NOTICE 'Exchange open successful on attempt %', attempt_count;
            ELSE
                error_msg := COALESCE(result->>'message', 'Unknown error');
                RAISE NOTICE 'Exchange open failed on attempt %: %', attempt_count, error_msg;
                
                -- Wait 3 seconds before retry (except on last attempt)
                IF attempt_count < max_attempts THEN
                    PERFORM pg_sleep(3);
                END IF;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_msg := SQLERRM;
                RAISE NOTICE 'Exchange open error on attempt %: %', attempt_count, error_msg;
                
                -- Wait 3 seconds before retry (except on last attempt)
                IF attempt_count < max_attempts THEN
                    PERFORM pg_sleep(3);
                END IF;
        END;
    END LOOP;
    
    IF success THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Exchange opened successfully',
            'attempts', attempt_count,
            'data', result
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', 'Exchange open failed after ' || max_attempts || ' attempts. Last error: ' || COALESCE(error_msg, 'Unknown error'),
            'attempts', attempt_count,
            'last_error', error_msg
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the missing test functions
CREATE OR REPLACE FUNCTION test_new_schedule()
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'message', 'Testing new exchange schedule',
        'schedule', json_build_object(
            'sunday_2359', 'Close exchange and clear orders',
            'monday_0930', 'Clear order history (with 5x retry)',
            'monday_1003', 'Calculate share price (with 5x retry)',
            'monday_1005', 'Open exchange (with 5x retry)'
        ),
        'timezone', 'Africa/Windhoek (UTC+2)',
        'retry_logic', 'Each step retries up to 5 times with 3-second delays',
        'current_status', (SELECT get_exchange_status()),
        'test_time', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS JSON AS $$
DECLARE
    cron_jobs JSON;
BEGIN
    -- Get cron job information
    SELECT json_agg(
        json_build_object(
            'jobname', jobname,
            'schedule', schedule,
            'command', command,
            'active', active,
            'jobid', jobid
        ) ORDER BY 
            CASE jobname
                WHEN 'weekly-exchange-close' THEN 1
                WHEN 'weekly-history-clear' THEN 2
                WHEN 'weekly-price-calculation' THEN 3
                WHEN 'weekly-exchange-open' THEN 4
                ELSE 5
            END
    ) INTO cron_jobs
    FROM cron.job 
    WHERE jobname LIKE 'weekly-%';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Cron job status retrieved',
        'jobs', COALESCE(cron_jobs, '[]'::json),
        'total_jobs', (SELECT COUNT(*) FROM cron.job WHERE jobname LIKE 'weekly-%'),
        'checked_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error getting cron job status: ' || SQLERRM,
            'error_code', 'CRON_STATUS_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_weekly_cycle_test()
RETURNS JSON AS $$
DECLARE
    close_result JSON;
    clear_result JSON;
    price_result JSON;
    open_result JSON;
    final_status JSON;
BEGIN
    -- Test the full weekly cycle
    RAISE NOTICE 'Starting weekly cycle test...';
    
    -- 1. Close exchange
    BEGIN
        SELECT close_exchange_weekly() INTO close_result;
        RAISE NOTICE 'Close exchange result: %', close_result;
    EXCEPTION
        WHEN OTHERS THEN
            close_result := json_build_object('success', false, 'message', 'Close failed: ' || SQLERRM);
    END;
    
    -- 2. Clear history
    BEGIN
        SELECT clear_history_with_retries() INTO clear_result;
        RAISE NOTICE 'Clear history result: %', clear_result;
    EXCEPTION
        WHEN OTHERS THEN
            clear_result := json_build_object('success', false, 'message', 'Clear failed: ' || SQLERRM);
    END;
    
    -- 3. Calculate price
    BEGIN
        SELECT calculate_price_with_retries() INTO price_result;
        RAISE NOTICE 'Price calculation result: %', price_result;
    EXCEPTION
        WHEN OTHERS THEN
            price_result := json_build_object('success', false, 'message', 'Price calc failed: ' || SQLERRM);
    END;
    
    -- 4. Open exchange
    BEGIN
        SELECT open_exchange_with_retries() INTO open_result;
        RAISE NOTICE 'Open exchange result: %', open_result;
    EXCEPTION
        WHEN OTHERS THEN
            open_result := json_build_object('success', false, 'message', 'Open failed: ' || SQLERRM);
    END;
    
    -- 5. Get final status
    BEGIN
        SELECT get_exchange_status() INTO final_status;
    EXCEPTION
        WHEN OTHERS THEN
            final_status := json_build_object('error', 'Status check failed: ' || SQLERRM);
    END;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Weekly cycle test completed',
        'results', json_build_object(
            'close_exchange', close_result,
            'clear_history', clear_result,
            'calculate_price', price_result,
            'open_exchange', open_result,
            'final_status', final_status
        ),
        'test_completed_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error in weekly cycle test: ' || SQLERRM,
            'error_code', 'WEEKLY_CYCLE_TEST_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up the new cron schedule (chronological order)
-- 1. Sunday 23:59 - Close exchange and clear all orders
SELECT cron.schedule(
    'weekly-exchange-close',
    '59 23 * * 0',  -- Sunday 23:59
    'SELECT close_exchange_weekly();'
);

-- 2. Monday 09:30 - Clear order history (with retries)
SELECT cron.schedule(
    'weekly-history-clear',
    '30 9 * * 1',   -- Monday 09:30 Windhoek time
    'SELECT clear_history_with_retries();'
);

-- 3. Monday 10:03 - Calculate new share price (with retries)
SELECT cron.schedule(
    'weekly-price-calculation',
    '3 10 * * 1',   -- Monday 10:03 Windhoek time
    'SELECT calculate_price_with_retries();'
);

-- 4. Monday 10:05 - Open exchange (with retries)
SELECT cron.schedule(
    'weekly-exchange-open',
    '5 10 * * 1',   -- Monday 10:05 Windhoek time
    'SELECT open_exchange_with_retries();'
);

-- Update the exchange status function to reflect new times
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    current_time TIMESTAMP WITH TIME ZONE;
    current_day INTEGER;
    current_hour INTEGER;
    current_minute INTEGER;
    is_open BOOLEAN := false;
    status_msg TEXT;
    current_price NUMERIC;
    current_week DATE;
    last_price_update TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current time in Windhoek timezone (CAT/SAST - UTC+2)
    current_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    current_day := EXTRACT(DOW FROM current_time); -- 0=Sunday, 1=Monday, etc.
    current_hour := EXTRACT(HOUR FROM current_time);
    current_minute := EXTRACT(MINUTE FROM current_time);
    
    -- Get current week start (Monday)
    current_week := DATE_TRUNC('week', current_time)::DATE + INTERVAL '1 day';
    
    -- Get current share price
    BEGIN
        SELECT get_current_share_price() INTO current_price;
    EXCEPTION
        WHEN OTHERS THEN
            current_price := 108.2; -- Fallback price
    END;
    
    -- Get last price update
    BEGIN
        SELECT effective_date INTO last_price_update
        FROM weekly_prices 
        ORDER BY effective_date DESC 
        LIMIT 1;
    EXCEPTION
        WHEN OTHERS THEN
            last_price_update := NOW();
    END;
    
    -- Determine if exchange is open based on new schedule
    -- Open: Monday 10:05 to Sunday 23:59
    IF current_day = 0 THEN  -- Sunday
        IF current_hour < 23 OR (current_hour = 23 AND current_minute < 59) THEN
            is_open := true;
            status_msg := 'Share Exchange is live! Current price: N$' || current_price || ' per share';
        ELSE
            is_open := false;
            status_msg := 'Exchange closing for weekly maintenance. Trading resumes Monday at 10:05 (Windhoek time)';
        END IF;
    ELSIF current_day = 1 THEN  -- Monday
        IF current_hour < 10 OR (current_hour = 10 AND current_minute < 5) THEN
            is_open := false;
            IF current_hour < 9 OR (current_hour = 9 AND current_minute < 30) THEN
                status_msg := 'Exchange closed - Weekly maintenance in progress. Opens at 10:05 (Windhoek time)';
            ELSIF current_hour = 9 AND current_minute >= 30 AND current_minute < 60 THEN
                status_msg := 'Exchange closed - Clearing order history. Opens at 10:05 (Windhoek time)';
            ELSIF current_hour = 10 AND current_minute >= 0 AND current_minute < 3 THEN
                status_msg := 'Exchange closed - Preparing for price calculation. Opens at 10:05 (Windhoek time)';
            ELSIF current_hour = 10 AND current_minute >= 3 AND current_minute < 5 THEN
                status_msg := 'Exchange closed - Calculating new share price. Opens at 10:05 (Windhoek time)';
            END IF;
        ELSE
            is_open := true;
            status_msg := 'Share Exchange is live! Current price: N$' || current_price || ' per share';
        END IF;
    ELSE  -- Tuesday to Saturday
        is_open := true;
        status_msg := 'Share Exchange is live! Current price: N$' || current_price || ' per share';
    END IF;
    
    RETURN json_build_object(
        'is_trading_open', is_open,
        'status_message', status_msg,
        'current_price', current_price,
        'current_week_start', current_week,
        'last_price_update', last_price_update,
        'last_updated', NOW(),
        'windhoek_time', current_time,
        'trading_schedule', json_build_object(
            'weekly_close', 'Sunday 23:59',
            'history_clear', 'Monday 09:30',
            'price_calculation', 'Monday 10:03',
            'weekly_open', 'Monday 10:05',
            'timezone', 'Africa/Windhoek (UTC+2)'
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error getting exchange status: ' || SQLERRM,
            'error_code', 'EXCHANGE_STATUS_ERROR',
            'fallback_data', json_build_object(
                'is_trading_open', false,
                'status_message', 'Exchange status unavailable',
                'current_price', 108.2
            )
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Show final cron job status
DO $$
DECLARE
    job_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO job_count FROM cron.job WHERE jobname LIKE 'weekly-%';
    
    RAISE NOTICE '=== UPDATED EXCHANGE SCHEDULE ===';
    RAISE NOTICE 'All times in Africa/Windhoek timezone (UTC+2)';
    RAISE NOTICE '';
    RAISE NOTICE 'Sunday  23:59 - Close exchange & clear orders';
    RAISE NOTICE 'Monday  09:30 - Clear order history (5x retry)';
    RAISE NOTICE 'Monday  10:03 - Calculate share price (5x retry)';
    RAISE NOTICE 'Monday  10:05 - Open exchange (5x retry)';
    RAISE NOTICE '';
    RAISE NOTICE 'Each step includes automatic retry logic:';
    RAISE NOTICE '- Up to 5 attempts per operation';
    RAISE NOTICE '- 3 second delay between retries';
    RAISE NOTICE '- Detailed logging of all attempts';
    RAISE NOTICE '';
    RAISE NOTICE 'Total cron jobs scheduled: %', job_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Test commands:';
    RAISE NOTICE '- SELECT test_new_schedule();';
    RAISE NOTICE '- SELECT get_exchange_status();';
    RAISE NOTICE '- SELECT get_cron_job_status();';
    RAISE NOTICE '- SELECT trigger_weekly_cycle_test();';
END $$;
