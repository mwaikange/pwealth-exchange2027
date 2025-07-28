-- STEP 3: Create exchange trading hours and status management

-- Create exchange_status table to track trading hours
CREATE TABLE IF NOT EXISTS exchange_status (
    id SERIAL PRIMARY KEY,
    is_open BOOLEAN DEFAULT false,
    current_week DATE,
    opened_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    next_open_time TIMESTAMP WITH TIME ZONE,
    next_close_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial exchange status if not exists
INSERT INTO exchange_status (is_open, current_week, next_open_time, next_close_time)
SELECT 
    false,
    DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day',
    -- Next Monday 10:05 Windhoek time
    (DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek') + INTERVAL '1 day' + INTERVAL '10 hours 5 minutes')::TIMESTAMP WITH TIME ZONE,
    -- Next Friday 16:00 Windhoek time  
    (DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek') + INTERVAL '5 days' + INTERVAL '16 hours')::TIMESTAMP WITH TIME ZONE
WHERE NOT EXISTS (SELECT 1 FROM exchange_status);

-- Function to check if exchange is currently open
CREATE OR REPLACE FUNCTION is_exchange_open()
RETURNS BOOLEAN AS $$
DECLARE
    current_time TIMESTAMP WITH TIME ZONE;
    windhoek_time TIMESTAMP WITH TIME ZONE;
    day_of_week INTEGER;
    hour_of_day INTEGER;
    minute_of_day INTEGER;
BEGIN
    -- Get current time in Windhoek timezone (UTC+2)
    windhoek_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    day_of_week := EXTRACT(DOW FROM windhoek_time); -- 0=Sunday, 1=Monday, etc.
    hour_of_day := EXTRACT(HOUR FROM windhoek_time);
    minute_of_day := EXTRACT(MINUTE FROM windhoek_time);
    
    -- Exchange is open Monday (1) 10:05 to Friday (5) 16:00 Windhoek time
    IF day_of_week = 1 THEN -- Monday
        RETURN (hour_of_day > 10 OR (hour_of_day = 10 AND minute_of_day >= 5));
    ELSIF day_of_week >= 2 AND day_of_week <= 4 THEN -- Tuesday to Thursday
        RETURN true;
    ELSIF day_of_week = 5 THEN -- Friday
        RETURN (hour_of_day < 16);
    ELSE -- Weekend (Saturday, Sunday)
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get exchange status
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    is_open BOOLEAN;
    windhoek_time TIMESTAMP WITH TIME ZONE;
    next_open TIMESTAMP WITH TIME ZONE;
    next_close TIMESTAMP WITH TIME ZONE;
    current_week DATE;
BEGIN
    windhoek_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    current_week := DATE_TRUNC('week', windhoek_time)::DATE + INTERVAL '1 day';
    is_open := is_exchange_open();
    
    -- Calculate next open/close times
    IF is_open THEN
        -- If open, next event is close (Friday 16:00)
        next_close := (current_week + INTERVAL '4 days' + INTERVAL '16 hours')::TIMESTAMP WITH TIME ZONE;
        next_open := NULL;
    ELSE
        -- If closed, next event is open (Monday 10:05)
        IF EXTRACT(DOW FROM windhoek_time) >= 1 AND EXTRACT(DOW FROM windhoek_time) <= 5 THEN
            -- If it's during the week but after hours, next open is next Monday
            next_open := (current_week + INTERVAL '7 days' + INTERVAL '10 hours 5 minutes')::TIMESTAMP WITH TIME ZONE;
        ELSE
            -- If it's weekend, next open is this coming Monday
            next_open := (current_week + INTERVAL '10 hours 5 minutes')::TIMESTAMP WITH TIME ZONE;
        END IF;
        next_close := NULL;
    END IF;
    
    -- Update exchange_status table
    UPDATE exchange_status 
    SET 
        is_open = get_exchange_status.is_open,
        current_week = get_exchange_status.current_week,
        next_open_time = next_open,
        next_close_time = next_close,
        updated_at = NOW();
    
    RETURN json_build_object(
        'is_open', is_open,
        'current_time_windhoek', windhoek_time,
        'current_week', current_week,
        'next_open_time', next_open,
        'next_close_time', next_close,
        'trading_hours', 'Monday 10:05 - Friday 16:00 (Windhoek Time)',
        'timezone', 'Africa/Windhoek (UTC+2)'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually open exchange (for admin use)
CREATE OR REPLACE FUNCTION manual_open_exchange()
RETURNS JSON AS $$
BEGIN
    UPDATE exchange_status 
    SET 
        is_open = true,
        opened_at = NOW(),
        updated_at = NOW();
    
    RETURN json_build_object(
        'success', true,
        'message', 'Exchange manually opened',
        'opened_at', NOW(),
        'status', 'TRADING_OPEN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually close exchange (for admin use)
CREATE OR REPLACE FUNCTION manual_close_exchange()
RETURNS JSON AS $$
BEGIN
    UPDATE exchange_status 
    SET 
        is_open = false,
        closed_at = NOW(),
        updated_at = NOW();
    
    RETURN json_build_object(
        'success', true,
        'message', 'Exchange manually closed',
        'closed_at', NOW(),
        'status', 'TRADING_CLOSED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for exchange_status
CREATE INDEX IF NOT EXISTS idx_exchange_status_current_week ON exchange_status(current_week DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_status_is_open ON exchange_status(is_open);

-- Success message for step 3
DO $$
DECLARE
    status_count INTEGER;
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO status_count FROM exchange_status;
    
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'is_exchange_open',
        'get_exchange_status',
        'manual_open_exchange',
        'manual_close_exchange'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                      █';
    RAISE NOTICE '█                    ✅ STEP 3 COMPLETED SUCCESSFULLY!                █';
    RAISE NOTICE '█                    Exchange Trading Hours Setup                     █';
    RAISE NOTICE '█                                                                      █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '✓ exchange_status table created with % records', status_count;
    RAISE NOTICE '✓ is_exchange_open() function created';
    RAISE NOTICE '✓ get_exchange_status() function created';
    RAISE NOTICE '✓ manual_open_exchange() function created';
    RAISE NOTICE '✓ manual_close_exchange() function created';
    RAISE NOTICE '';
    RAISE NOTICE '⏰ Trading Hours: Monday 10:05 - Friday 16:00 (Windhoek Time)';
    RAISE NOTICE '🌍 Timezone: Africa/Windhoek (UTC+2)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 READY FOR STEP 4: Run 04-setup-cron-schedule.sql';
    RAISE NOTICE '';
END $$;
