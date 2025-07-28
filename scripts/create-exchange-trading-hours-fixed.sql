-- Create exchange trading hours system with proper status tracking

-- Create exchange_status table to track current state
CREATE TABLE IF NOT EXISTS exchange_status (
    id SERIAL PRIMARY KEY,
    is_trading_open BOOLEAN NOT NULL DEFAULT false,
    current_week_start DATE,
    last_price_update TIMESTAMP WITH TIME ZONE,
    status_message TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial status if table is empty
INSERT INTO exchange_status (is_trading_open, current_week_start, status_message)
SELECT 
    true,
    DATE_TRUNC('week', NOW())::DATE + INTERVAL '1 day',
    'Share Exchange is live! Trading in progress.'
WHERE NOT EXISTS (SELECT 1 FROM exchange_status);

-- Create function to update exchange status
CREATE OR REPLACE FUNCTION update_exchange_status(
    p_is_open BOOLEAN,
    p_message TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    current_week DATE;
    current_price NUMERIC;
BEGIN
    current_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day';
    
    -- Get current price
    SELECT get_current_share_price() INTO current_price;
    
    -- Update or insert status
    INSERT INTO exchange_status (
        is_trading_open,
        current_week_start,
        status_message,
        last_updated
    ) VALUES (
        p_is_open,
        current_week,
        COALESCE(p_message, 
            CASE 
                WHEN p_is_open THEN 'Share Exchange is live! Current price: N$' || current_price || ' per share'
                ELSE 'Exchange closed for maintenance'
            END
        ),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        is_trading_open = EXCLUDED.is_trading_open,
        current_week_start = EXCLUDED.current_week_start,
        status_message = EXCLUDED.status_message,
        last_updated = EXCLUDED.last_updated
    WHERE exchange_status.id = (SELECT MIN(id) FROM exchange_status);
    
    RETURN json_build_object(
        'success', true,
        'message', 'Exchange status updated',
        'is_trading_open', p_is_open,
        'status_message', COALESCE(p_message, 'Status updated'),
        'updated_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error updating exchange status: ' || SQLERRM,
            'error_code', 'STATUS_UPDATE_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced get_exchange_status function
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
    stored_status RECORD;
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
    
    -- Get stored exchange status
    BEGIN
        SELECT * INTO stored_status
        FROM exchange_status
        ORDER BY id
        LIMIT 1;
    EXCEPTION
        WHEN OTHERS THEN
            stored_status := NULL;
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
    
    -- Update stored status if different
    IF stored_status IS NULL OR stored_status.is_trading_open != is_open THEN
        PERFORM update_exchange_status(is_open, status_msg);
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
        ),
        'current_day_info', json_build_object(
            'day_of_week', current_day,
            'hour', current_hour,
            'minute', current_minute,
            'day_name', CASE current_day
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
            END
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

-- Create function to check if trading is allowed
CREATE OR REPLACE FUNCTION is_trading_allowed()
RETURNS BOOLEAN AS $$
DECLARE
    status_result JSON;
    is_open BOOLEAN;
BEGIN
    SELECT get_exchange_status() INTO status_result;
    
    -- Extract is_trading_open from JSON
    is_open := (status_result->>'is_trading_open')::boolean;
    
    RETURN COALESCE(is_open, false);
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return false on any error (safe default)
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exchange_status_updated ON exchange_status(last_updated DESC);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== EXCHANGE TRADING HOURS SYSTEM CREATED ===';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '- exchange_status';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- get_exchange_status()';
    RAISE NOTICE '- update_exchange_status()';
    RAISE NOTICE '- is_trading_allowed()';
    RAISE NOTICE '';
    RAISE NOTICE 'Trading Schedule (Africa/Windhoek UTC+2):';
    RAISE NOTICE '- Sunday 23:59: Exchange closes';
    RAISE NOTICE '- Monday 09:30: Clear order history';
    RAISE NOTICE '- Monday 10:03: Calculate new prices';
    RAISE NOTICE '- Monday 10:05: Exchange opens';
    RAISE NOTICE '';
    RAISE NOTICE 'Use SELECT get_exchange_status(); to check current status';
END $$;
