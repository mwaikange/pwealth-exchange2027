-- Create exchange trading hours and status functions

-- Create exchange_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS exchange_status (
    id SERIAL PRIMARY KEY,
    is_open BOOLEAN DEFAULT false,
    current_week DATE,
    opened_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    next_opening TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial exchange status if empty
INSERT INTO exchange_status (is_open, current_week, next_opening)
SELECT 
    false,
    DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day',
    (DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day' + INTERVAL '10 hours 5 minutes')::TIMESTAMP WITH TIME ZONE
WHERE NOT EXISTS (SELECT 1 FROM exchange_status);

-- Function to get exchange status
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    status_record RECORD;
    current_windhoek_time TIMESTAMP WITH TIME ZONE;
    next_monday_1005 TIMESTAMP WITH TIME ZONE;
    is_trading_hours BOOLEAN;
    current_week DATE;
BEGIN
    current_windhoek_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    current_week := DATE_TRUNC('week', current_windhoek_time)::DATE + INTERVAL '1 day';
    
    -- Calculate next Monday 10:05 Windhoek time
    next_monday_1005 := (current_week + INTERVAL '10 hours 5 minutes')::TIMESTAMP WITH TIME ZONE;
    
    -- Check if we're in trading hours (Monday 10:05 to Sunday 23:59 Windhoek time)
    is_trading_hours := EXTRACT(DOW FROM current_windhoek_time) BETWEEN 1 AND 6 
                       OR (EXTRACT(DOW FROM current_windhoek_time) = 1 AND EXTRACT(HOUR FROM current_windhoek_time) >= 10 AND EXTRACT(MINUTE FROM current_windhoek_time) >= 5)
                       OR EXTRACT(DOW FROM current_windhoek_time) = 0;
    
    -- Get current status
    SELECT * INTO status_record FROM exchange_status ORDER BY id DESC LIMIT 1;
    
    IF status_record IS NULL THEN
        -- Create initial status
        INSERT INTO exchange_status (is_open, current_week, next_opening)
        VALUES (false, current_week, next_monday_1005)
        RETURNING * INTO status_record;
    END IF;
    
    RETURN json_build_object(
        'is_open', status_record.is_open,
        'current_week', status_record.current_week,
        'current_windhoek_time', current_windhoek_time,
        'next_opening', CASE 
            WHEN status_record.is_open THEN 'Currently Open'
            ELSE to_char(next_monday_1005, 'Day, DD Mon YYYY at HH24:MI') || ' (Windhoek UTC+2)'
        END,
        'trading_schedule', json_build_object(
            'opens', 'Monday 10:05 Windhoek time',
            'closes', 'Sunday 23:59 Windhoek time',
            'timezone', 'Africa/Windhoek (UTC+2)'
        ),
        'is_trading_hours', is_trading_hours,
        'opened_at', status_record.opened_at,
        'closed_at', status_record.closed_at
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

-- Function to test the new schedule
CREATE OR REPLACE FUNCTION test_new_schedule()
RETURNS JSON AS $$
DECLARE
    current_windhoek_time TIMESTAMP WITH TIME ZONE;
    next_monday DATE;
    schedule_times JSON;
BEGIN
    current_windhoek_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    next_monday := DATE_TRUNC('week', current_windhoek_time)::DATE + INTERVAL '1 day';
    
    schedule_times := json_build_object(
        'current_windhoek_time', current_windhoek_time,
        'next_monday', next_monday,
        'schedule', json_build_object(
            'history_clear', to_char((next_monday + INTERVAL '9 hours 30 minutes')::TIMESTAMP, 'Day DD Mon YYYY HH24:MI') || ' Windhoek',
            'price_calculation', to_char((next_monday + INTERVAL '10 hours 3 minutes')::TIMESTAMP, 'Day DD Mon YYYY HH24:MI') || ' Windhoek',
            'exchange_open', to_char((next_monday + INTERVAL '10 hours 5 minutes')::TIMESTAMP, 'Day DD Mon YYYY HH24:MI') || ' Windhoek',
            'exchange_close', to_char((next_monday + INTERVAL '6 days 23 hours 59 minutes')::TIMESTAMP, 'Day DD Mon YYYY HH24:MI') || ' Windhoek'
        ),
        'cron_expressions', json_build_object(
            'history_clear', '30 9 * * 1',
            'price_calculation', '3 10 * * 1', 
            'exchange_open', '5 10 * * 1',
            'exchange_close', '59 23 * * 0'
        ),
        'timezone', 'Africa/Windhoek (UTC+2)',
        'retry_policy', 'Up to 5 retries with 3-second delays'
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'New schedule test completed',
        'schedule_info', schedule_times
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

-- Function to get cron job status
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
            'active', active
        )
    ) INTO cron_jobs
    FROM cron.job 
    WHERE jobname LIKE '%weekly%' OR jobname LIKE '%exchange%' OR jobname LIKE '%price%';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Cron job status retrieved',
        'jobs', COALESCE(cron_jobs, '[]'::json),
        'expected_jobs', json_build_array(
            'clear_history_with_retries_weekly',
            'calculate_price_with_retries_weekly', 
            'open_exchange_with_retries_weekly',
            'close_exchange_weekly'
        )
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

-- Function to trigger weekly cycle test
CREATE OR REPLACE FUNCTION trigger_weekly_cycle_test()
RETURNS JSON AS $$
DECLARE
    clear_result JSON;
    price_result JSON;
    open_result JSON;
    all_success BOOLEAN := true;
BEGIN
    RAISE NOTICE 'Starting weekly cycle test...';
    
    -- Test 1: Clear history
    BEGIN
        SELECT clear_weekly_order_history() INTO clear_result;
        IF NOT (clear_result->>'success')::BOOLEAN THEN
            all_success := false;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            clear_result := json_build_object('success', false, 'error', SQLERRM);
            all_success := false;
    END;
    
    -- Test 2: Calculate price
    BEGIN
        SELECT calculate_weekly_share_price_simplified() INTO price_result;
        IF NOT (price_result->>'success')::BOOLEAN THEN
            all_success := false;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            price_result := json_build_object('success', false, 'error', SQLERRM);
            all_success := false;
    END;
    
    -- Test 3: Open exchange
    BEGIN
        SELECT open_exchange_weekly() INTO open_result;
        IF NOT (open_result->>'success')::BOOLEAN THEN
            all_success := false;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            open_result := json_build_object('success', false, 'error', SQLERRM);
            all_success := false;
    END;
    
    RETURN json_build_object(
        'success', all_success,
        'message', CASE 
            WHEN all_success THEN 'Weekly cycle test completed successfully'
            ELSE 'Weekly cycle test completed with some errors'
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
            'message', 'Error in weekly cycle test: ' || SQLERRM,
            'error_code', 'WEEKLY_CYCLE_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exchange_status_updated ON exchange_status(updated_at DESC);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== EXCHANGE TRADING HOURS SETUP COMPLETE ===';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- get_exchange_status()';
    RAISE NOTICE '- test_new_schedule()';
    RAISE NOTICE '- get_cron_job_status()';
    RAISE NOTICE '- trigger_weekly_cycle_test()';
    RAISE NOTICE '';
    RAISE NOTICE 'Table created:';
    RAISE NOTICE '- exchange_status';
    RAISE NOTICE '';
    RAISE NOTICE 'New Schedule (Africa/Windhoek UTC+2):';
    RAISE NOTICE '- Monday 09:30 - Clear order history';
    RAISE NOTICE '- Monday 10:03 - Calculate share price';
    RAISE NOTICE '- Monday 10:05 - Open exchange';
    RAISE NOTICE '- Sunday 23:59 - Close exchange';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for cron job setup!';
END $$;
