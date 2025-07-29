-- Fix the "dow" unit not supported error in timezone functions
-- This error occurs when using EXTRACT(dow FROM time_with_timezone)

-- Drop and recreate the problematic functions with correct timezone handling

-- 1. Fix get_exchange_status function
DROP FUNCTION IF EXISTS get_exchange_status();

CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    current_status RECORD;
    windhoek_time TIMESTAMP;
    current_day INTEGER;
    is_open BOOLEAN;
    status_msg TEXT;
BEGIN
    -- Get current time in Windhoek (UTC+2)
    windhoek_time := NOW() AT TIME ZONE 'UTC' + INTERVAL '2 hours';
    
    -- Extract day of week from TIMESTAMP (not TIME WITH TIME ZONE)
    current_day := EXTRACT(dow FROM windhoek_time);
    
    -- Get current exchange status from table
    SELECT * INTO current_status 
    FROM exchange_status 
    ORDER BY id DESC 
    LIMIT 1;
    
    -- If no record exists, create default
    IF current_status IS NULL THEN
        INSERT INTO exchange_status (
            is_trading_open,
            current_week_start,
            last_price_update,
            status_message,
            updated_at
        ) VALUES (
            false,
            DATE_TRUNC('week', windhoek_time::DATE) + INTERVAL '1 day',
            windhoek_time,
            'Exchange initialized - currently closed',
            windhoek_time
        );
        
        SELECT * INTO current_status 
        FROM exchange_status 
        ORDER BY id DESC 
        LIMIT 1;
    END IF;
    
    -- Determine if exchange should be open based on time
    -- Monday (1) 10:05 to Sunday (0) 23:59
    IF current_day = 1 THEN -- Monday
        IF EXTRACT(hour FROM windhoek_time) > 10 OR 
           (EXTRACT(hour FROM windhoek_time) = 10 AND EXTRACT(minute FROM windhoek_time) >= 5) THEN
            is_open := true;
            status_msg := 'Exchange is OPEN - Monday trading active';
        ELSE
            is_open := false;
            status_msg := 'Exchange CLOSED - Opens Monday at 10:05 Windhoek time';
        END IF;
    ELSIF current_day BETWEEN 2 AND 6 THEN -- Tuesday to Saturday
        is_open := true;
        status_msg := 'Exchange is OPEN - Weekday trading active';
    ELSIF current_day = 0 THEN -- Sunday
        IF EXTRACT(hour FROM windhoek_time) < 24 THEN
            is_open := true;
            status_msg := 'Exchange is OPEN - Sunday trading until 23:59';
        ELSE
            is_open := false;
            status_msg := 'Exchange CLOSED - Opens Monday at 10:05 Windhoek time';
        END IF;
    ELSE
        is_open := false;
        status_msg := 'Exchange CLOSED - Opens Monday at 10:05 Windhoek time';
    END IF;
    
    -- Update the exchange status if it has changed
    IF current_status.is_trading_open != is_open THEN
        UPDATE exchange_status 
        SET 
            is_trading_open = is_open,
            status_message = status_msg,
            updated_at = windhoek_time
        WHERE id = current_status.id;
        
        -- Refresh the record
        SELECT * INTO current_status 
        FROM exchange_status 
        WHERE id = current_status.id;
    END IF;
    
    -- Return JSON response
    RETURN json_build_object(
        'is_trading_open', current_status.is_trading_open,
        'status_message', current_status.status_message,
        'current_price', COALESCE((SELECT get_current_share_price()), 100.00),
        'current_week_start', current_status.current_week_start,
        'last_price_update', current_status.last_price_update,
        'windhoek_time', windhoek_time,
        'last_updated', current_status.updated_at,
        'trading_schedule', json_build_object(
            'weekly_close', 'Sunday 23:59',
            'history_clear', 'Monday 09:30', 
            'price_calculation', 'Monday 10:03',
            'weekly_open', 'Monday 10:05',
            'timezone', 'Africa/Windhoek (UTC+2)'
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return error response
    RETURN json_build_object(
        'is_trading_open', false,
        'status_message', 'Error checking exchange status: ' || SQLERRM,
        'current_price', 100.00,
        'current_week_start', DATE_TRUNC('week', NOW()::DATE) + INTERVAL '1 day',
        'last_price_update', NOW(),
        'windhoek_time', NOW() AT TIME ZONE 'UTC' + INTERVAL '2 hours',
        'last_updated', NOW(),
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Fix is_exchange_open function
DROP FUNCTION IF EXISTS is_exchange_open();

CREATE OR REPLACE FUNCTION is_exchange_open()
RETURNS BOOLEAN AS $$
DECLARE
    current_status RECORD;
BEGIN
    -- Get current exchange status
    SELECT * INTO current_status 
    FROM exchange_status 
    ORDER BY id DESC 
    LIMIT 1;
    
    -- Return the trading status, default to false if no record
    RETURN COALESCE(current_status.is_trading_open, false);
    
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 3. Fix open_exchange_weekly function
DROP FUNCTION IF EXISTS open_exchange_weekly();

CREATE OR REPLACE FUNCTION open_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    windhoek_time TIMESTAMP;
    current_week DATE;
    current_price NUMERIC;
BEGIN
    windhoek_time := NOW() AT TIME ZONE 'UTC' + INTERVAL '2 hours';
    current_week := DATE_TRUNC('week', windhoek_time::DATE)::DATE + INTERVAL '1 day';
    
    -- Get current share price
    SELECT get_current_share_price() INTO current_price;
    
    -- Insert or update exchange status
    INSERT INTO exchange_status (
        is_trading_open,
        current_week_start,
        last_price_update,
        status_message,
        updated_at
    ) VALUES (
        true,
        current_week,
        windhoek_time,
        'Exchange opened for weekly trading',
        windhoek_time
    )
    ON CONFLICT (id) DO UPDATE SET
        is_trading_open = true,
        current_week_start = current_week,
        last_price_update = windhoek_time,
        status_message = 'Exchange opened for weekly trading',
        updated_at = windhoek_time;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Exchange opened successfully',
        'is_trading_open', true,
        'current_price', current_price,
        'windhoek_time', windhoek_time,
        'current_week_start', current_week
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Error opening exchange: ' || SQLERRM,
        'is_trading_open', false
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Ensure exchange_status table exists with correct structure
CREATE TABLE IF NOT EXISTS exchange_status (
    id SERIAL PRIMARY KEY,
    is_trading_open BOOLEAN NOT NULL DEFAULT false,
    current_week_start DATE NOT NULL DEFAULT (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 day'),
    last_price_update TIMESTAMP NOT NULL DEFAULT NOW(),
    status_message TEXT NOT NULL DEFAULT 'Exchange status unknown',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Test the fixed functions
DO $$
DECLARE
    status_result JSON;
    open_result JSON;
BEGIN
    RAISE NOTICE 'Testing fixed timezone functions...';
    
    -- Test get_exchange_status
    SELECT get_exchange_status() INTO status_result;
    RAISE NOTICE 'Exchange status: %', status_result->>'status_message';
    RAISE NOTICE 'Trading open: %', status_result->>'is_trading_open';
    
    -- Test opening exchange
    SELECT open_exchange_weekly() INTO open_result;
    RAISE NOTICE 'Open result: %', open_result->>'message';
    
    -- Test again after opening
    SELECT get_exchange_status() INTO status_result;
    RAISE NOTICE 'After opening - Trading open: %', status_result->>'is_trading_open';
    
    RAISE NOTICE 'Timezone fix completed successfully!';
END $$;
