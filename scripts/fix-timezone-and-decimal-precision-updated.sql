-- Fix timezone handling by using UTC+2 directly instead of named timezones
-- This avoids casting and type mismatch issues in Postgres

-- Drop existing functions to recreate with fixed timezone handling
DROP FUNCTION IF EXISTS get_exchange_status();
DROP FUNCTION IF EXISTS calculate_weekly_share_price_simplified();
DROP FUNCTION IF EXISTS clear_weekly_order_history();
DROP FUNCTION IF EXISTS open_exchange_weekly();
DROP FUNCTION IF EXISTS close_exchange_weekly();
DROP FUNCTION IF EXISTS get_current_share_price();
DROP FUNCTION IF EXISTS get_price_history();

-- 1. Get Exchange Status Function (UTC+2 direct)
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS TABLE(
    is_open BOOLEAN,
    current_time_utc2 TIMESTAMP,
    day_of_week INTEGER,
    hour_of_day INTEGER,
    last_opened TIMESTAMP,
    last_closed TIMESTAMP,
    next_open TIMESTAMP,
    next_close TIMESTAMP
) AS $$
DECLARE
    current_utc2 TIMESTAMP;
    current_dow INTEGER;
    current_hour INTEGER;
    exchange_open BOOLEAN;
BEGIN
    -- Get current time in UTC+2 (Namibian time)
    current_utc2 := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    
    -- Extract day of week (1=Monday, 7=Sunday) and hour
    current_dow := EXTRACT(ISODOW FROM current_utc2);
    current_hour := EXTRACT(HOUR FROM current_utc2);
    
    -- Exchange is open Monday-Friday, 9 AM to 5 PM UTC+2
    exchange_open := (current_dow BETWEEN 1 AND 5) AND (current_hour BETWEEN 9 AND 16);
    
    RETURN QUERY SELECT
        exchange_open,
        current_utc2,
        current_dow,
        current_hour,
        (SELECT opened_at FROM exchange_trading_hours ORDER BY opened_at DESC LIMIT 1),
        (SELECT closed_at FROM exchange_trading_hours ORDER BY closed_at DESC LIMIT 1),
        -- Next open: Monday 9 AM if weekend, or tomorrow 9 AM if after hours
        CASE 
            WHEN current_dow = 6 THEN -- Saturday
                (DATE_TRUNC('week', current_utc2) + INTERVAL '7 days' + INTERVAL '9 hours')::TIMESTAMP
            WHEN current_dow = 7 THEN -- Sunday
                (DATE_TRUNC('week', current_utc2) + INTERVAL '8 days' + INTERVAL '9 hours')::TIMESTAMP
            WHEN current_hour >= 17 THEN -- After hours on weekday
                (DATE_TRUNC('day', current_utc2) + INTERVAL '1 day' + INTERVAL '9 hours')::TIMESTAMP
            ELSE -- During or before trading hours
                (DATE_TRUNC('day', current_utc2) + INTERVAL '9 hours')::TIMESTAMP
        END,
        -- Next close: 5 PM today if open, or 5 PM on next trading day
        CASE 
            WHEN exchange_open THEN
                (DATE_TRUNC('day', current_utc2) + INTERVAL '17 hours')::TIMESTAMP
            ELSE
                (DATE_TRUNC('day', current_utc2) + INTERVAL '1 day' + INTERVAL '17 hours')::TIMESTAMP
        END;
END;
$$ LANGUAGE plpgsql;

-- 2. Calculate Weekly Share Price (UTC+2 direct with decimal precision)
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_simplified()
RETURNS DECIMAL(10,2) AS $$
DECLARE
    current_utc2 TIMESTAMP;
    current_dow INTEGER;
    week_start DATE;
    week_end DATE;
    base_price DECIMAL(10,2) := 100.00;
    j200_growth DECIMAL(8,4);
    price_change DECIMAL(8,4);
    final_price DECIMAL(10,2);
BEGIN
    -- Get current time in UTC+2
    current_utc2 := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    current_dow := EXTRACT(ISODOW FROM current_utc2);
    
    -- Calculate week boundaries (Monday to Friday)
    week_start := DATE_TRUNC('week', current_utc2)::DATE;
    week_end := week_start + INTERVAL '4 days';
    
    -- Get JSE200 growth for the current week
    SELECT COALESCE(
        (SELECT ROUND(((friday_close - monday_open) / monday_open * 100), 4)
         FROM jse200_weekly_data 
         WHERE week_start_date = week_start
         AND friday_close IS NOT NULL 
         AND monday_open IS NOT NULL
         AND monday_open > 0),
        0.0
    ) INTO j200_growth;
    
    -- Calculate price change (amplified by 2x for higher volatility)
    price_change := ROUND(j200_growth * 2.0, 4);
    
    -- Apply change to base price
    final_price := ROUND(base_price * (1 + price_change / 100.0), 2);
    
    -- Ensure minimum price of N$50.00
    IF final_price < 50.00 THEN
        final_price := 50.00;
    END IF;
    
    -- Insert/update current pricing info
    INSERT INTO current_pricing_info (
        calculated_at,
        base_price,
        jse200_growth_percent,
        price_change_percent,
        final_price,
        week_start_date,
        week_end_date
    ) VALUES (
        current_utc2,
        base_price,
        j200_growth,
        price_change,
        final_price,
        week_start,
        week_end::DATE
    )
    ON CONFLICT (week_start_date) 
    DO UPDATE SET
        calculated_at = EXCLUDED.calculated_at,
        jse200_growth_percent = EXCLUDED.jse200_growth_percent,
        price_change_percent = EXCLUDED.price_change_percent,
        final_price = EXCLUDED.final_price;
    
    RETURN final_price;
END;
$$ LANGUAGE plpgsql;

-- 3. Clear Weekly Order History (UTC+2 direct)
CREATE OR REPLACE FUNCTION clear_weekly_order_history()
RETURNS INTEGER AS $$
DECLARE
    current_utc2 TIMESTAMP;
    cutoff_time TIMESTAMP;
    deleted_count INTEGER := 0;
BEGIN
    -- Get current time in UTC+2
    current_utc2 := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    
    -- Set cutoff to 1 week ago
    cutoff_time := current_utc2 - INTERVAL '7 days';
    
    -- Delete old buy orders
    DELETE FROM buy_orders 
    WHERE created_at < cutoff_time 
    AND status IN ('pending', 'expired');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old sell orders
    DELETE FROM sell_orders 
    WHERE created_at < cutoff_time 
    AND status IN ('pending', 'expired');
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Update remaining orders to expired if older than 24 hours
    UPDATE buy_orders 
    SET status = 'expired' 
    WHERE created_at < (current_utc2 - INTERVAL '24 hours')
    AND status = 'pending';
    
    UPDATE sell_orders 
    SET status = 'expired' 
    WHERE created_at < (current_utc2 - INTERVAL '24 hours')
    AND status = 'pending';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Open Exchange Weekly (UTC+2 direct)
CREATE OR REPLACE FUNCTION open_exchange_weekly()
RETURNS BOOLEAN AS $$
DECLARE
    current_utc2 TIMESTAMP;
    new_price DECIMAL(10,2);
BEGIN
    -- Get current time in UTC+2
    current_utc2 := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    
    -- Calculate new weekly price
    new_price := calculate_weekly_share_price_simplified();
    
    -- Record exchange opening
    INSERT INTO exchange_trading_hours (opened_at, status)
    VALUES (current_utc2, 'open')
    ON CONFLICT (DATE(opened_at)) 
    DO UPDATE SET 
        opened_at = EXCLUDED.opened_at,
        status = 'open';
    
    -- Clear old order history
    PERFORM clear_weekly_order_history();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. Close Exchange Weekly (UTC+2 direct)
CREATE OR REPLACE FUNCTION close_exchange_weekly()
RETURNS BOOLEAN AS $$
DECLARE
    current_utc2 TIMESTAMP;
BEGIN
    -- Get current time in UTC+2
    current_utc2 := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    
    -- Record exchange closing
    UPDATE exchange_trading_hours 
    SET closed_at = current_utc2, status = 'closed'
    WHERE DATE(opened_at) = DATE(current_utc2);
    
    -- Expire all pending orders
    UPDATE buy_orders SET status = 'expired' WHERE status = 'pending';
    UPDATE sell_orders SET status = 'expired' WHERE status = 'pending';
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. Get Current Share Price (with proper decimal formatting)
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS DECIMAL(10,2) AS $$
DECLARE
    current_price DECIMAL(10,2);
BEGIN
    -- Get the most recent calculated price
    SELECT ROUND(final_price, 2) INTO current_price
    FROM current_pricing_info 
    ORDER BY calculated_at DESC 
    LIMIT 1;
    
    -- If no price exists, calculate one
    IF current_price IS NULL THEN
        current_price := calculate_weekly_share_price_simplified();
    END IF;
    
    RETURN COALESCE(current_price, 100.00);
END;
$$ LANGUAGE plpgsql;

-- 7. Get Price History (with proper decimal formatting)
CREATE OR REPLACE FUNCTION get_price_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    date DATE,
    price DECIMAL(10,2),
    jse200_growth DECIMAL(8,4),
    price_change DECIMAL(8,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        week_start_date::DATE,
        ROUND(final_price, 2)::DECIMAL(10,2),
        ROUND(jse200_growth_percent, 4)::DECIMAL(8,4),
        ROUND(price_change_percent, 4)::DECIMAL(8,4)
    FROM current_pricing_info 
    WHERE week_start_date >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ORDER BY week_start_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
SELECT 'Testing timezone fixes...' as status;

-- Test exchange status
SELECT * FROM get_exchange_status();

-- Test price calculation
SELECT get_current_share_price() as current_price;

-- Test price history
SELECT * FROM get_price_history(7);

SELECT 'Timezone fixes completed successfully!' as status;
