-- Create exchange trading hours and status functions

-- Create exchange_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS exchange_status (
    id SERIAL PRIMARY KEY,
    is_open BOOLEAN NOT NULL DEFAULT false,
    current_week DATE,
    last_opened_at TIMESTAMP WITH TIME ZONE,
    last_closed_at TIMESTAMP WITH TIME ZONE,
    next_opening_time TEXT DEFAULT 'Monday 10:05 Windhoek time',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial exchange status if table is empty
INSERT INTO exchange_status (is_open, current_week, next_opening_time)
SELECT 
    false,
    DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day',
    'Monday 10:05 Windhoek time'
WHERE NOT EXISTS (SELECT 1 FROM exchange_status);

-- Function to get exchange status
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    status_record RECORD;
    current_week DATE;
    windhoek_time TIMESTAMP WITH TIME ZONE;
    is_monday BOOLEAN;
    current_hour INTEGER;
    current_minute INTEGER;
    is_trading_hours BOOLEAN;
BEGIN
    -- Get current Windhoek time
    windhoek_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    current_week := DATE_TRUNC('week', windhoek_time)::DATE + INTERVAL '1 day';
    
    -- Check if it's Monday and within trading hours (10:05-23:59)
    is_monday := EXTRACT(DOW FROM windhoek_time) = 1; -- Monday = 1
    current_hour := EXTRACT(HOUR FROM windhoek_time);
    current_minute := EXTRACT(MINUTE FROM windhoek_time);
    
    is_trading_hours := is_monday AND (
        current_hour > 10 OR 
        (current_hour = 10 AND current_minute >= 5)
    );
    
    -- Get current status
    SELECT * INTO status_record
    FROM exchange_status
    ORDER BY id DESC
    LIMIT 1;
    
    -- If no status record, create one
    IF status_record IS NULL THEN
        INSERT INTO exchange_status (is_open, current_week, next_opening_time)
        VALUES (false, current_week, 'Monday 10:05 Windhoek time')
        RETURNING * INTO status_record;
    END IF;
    
    RETURN json_build_object(
        'is_open', status_record.is_open,
        'current_week', status_record.current_week,
        'is_trading_hours', is_trading_hours,
        'is_monday', is_monday,
        'current_time_windhoek', windhoek_time,
        'current_hour', current_hour,
        'current_minute', current_minute,
        'last_opened_at', status_record.last_opened_at,
        'last_closed_at', status_record.last_closed_at,
        'next_opening_time', status_record.next_opening_time,
        'timezone', 'Africa/Windhoek (UTC+2)',
        'trading_schedule', json_build_object(
            'monday_open', '10:05',
            'sunday_close', '23:59',
            'weekly_cycle', 'Monday 10:05 - Sunday 23:59'
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error getting exchange status: ' || SQLERRM,
            'error_code', 'EXCHANGE_STATUS_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update exchange status
CREATE OR REPLACE FUNCTION update_exchange_status(new_status BOOLEAN, operation TEXT DEFAULT 'manual')
RETURNS JSON AS $$
DECLARE
    current_week DATE;
    windhoek_time TIMESTAMP WITH TIME ZONE;
BEGIN
    windhoek_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    current_week := DATE_TRUNC('week', windhoek_time)::DATE + INTERVAL '1 day';
    
    -- Update or insert exchange status
    INSERT INTO exchange_status (is_open, current_week, last_opened_at, last_closed_at, updated_at)
    VALUES (
        new_status,
        current_week,
        CASE WHEN new_status THEN windhoek_time ELSE NULL END,
        CASE WHEN NOT new_status THEN windhoek_time ELSE NULL END,
        windhoek_time
    )
    ON CONFLICT (id) DO UPDATE SET
        is_open = EXCLUDED.is_open,
        current_week = EXCLUDED.current_week,
        last_opened_at = CASE WHEN EXCLUDED.is_open THEN windhoek_time ELSE exchange_status.last_opened_at END,
        last_closed_at = CASE WHEN NOT EXCLUDED.is_open THEN windhoek_time ELSE exchange_status.last_closed_at END,
        updated_at = windhoek_time;
    
    RAISE NOTICE 'Exchange status updated: % (operation: %)', 
        CASE WHEN new_status THEN 'OPEN' ELSE 'CLOSED' END, operation;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Exchange %s successfully', 
            CASE WHEN new_status THEN 'opened' ELSE 'closed' END),
        'is_open', new_status,
        'current_week', current_week,
        'operation', operation,
        'updated_at', windhoek_time,
        'timezone', 'Africa/Windhoek (UTC+2)'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error updating exchange status: ' || SQLERRM,
            'error_code', 'EXCHANGE_UPDATE_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if exchange should be open
CREATE OR REPLACE FUNCTION should_exchange_be_open()
RETURNS BOOLEAN AS $$
DECLARE
    windhoek_time TIMESTAMP WITH TIME ZONE;
    is_monday BOOLEAN;
    current_hour INTEGER;
    current_minute INTEGER;
BEGIN
    windhoek_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    is_monday := EXTRACT(DOW FROM windhoek_time) = 1; -- Monday = 1
    current_hour := EXTRACT(HOUR FROM windhoek_time);
    current_minute := EXTRACT(MINUTE FROM windhoek_time);
    
    -- Exchange should be open on Monday from 10:05 onwards
    RETURN is_monday AND (
        current_hour > 10 OR 
        (current_hour = 10 AND current_minute >= 5)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exchange_status_updated_at ON exchange_status(updated_at DESC);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== EXCHANGE TRADING HOURS SETUP COMPLETE ===';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- get_exchange_status()';
    RAISE NOTICE '- update_exchange_status(boolean, text)';
    RAISE NOTICE '- should_exchange_be_open()';
    RAISE NOTICE '';
    RAISE NOTICE 'Table created:';
    RAISE NOTICE '- exchange_status';
    RAISE NOTICE '';
    RAISE NOTICE 'Trading Schedule:';
    RAISE NOTICE '- Opens: Monday 10:05 Windhoek time';
    RAISE NOTICE '- Closes: Sunday 23:59 Windhoek time';
    RAISE NOTICE '- Timezone: Africa/Windhoek (UTC+2)';
END $$;
