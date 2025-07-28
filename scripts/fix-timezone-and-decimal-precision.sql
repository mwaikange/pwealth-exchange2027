-- Fix timezone issues and decimal precision for price calculations
-- This addresses the "dow" unit error and ensures proper decimal formatting

-- 1. Fix the get_exchange_status function to handle timezone properly
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS TABLE(
    is_open BOOLEAN,
    message TEXT,
    next_open_time TIMESTAMPTZ,
    next_close_time TIMESTAMPTZ
) AS $$
DECLARE
    current_time TIMESTAMPTZ;
    current_day INTEGER;
    current_hour INTEGER;
    current_minute INTEGER;
    open_time TIME := '10:05:00';
    close_time TIME := '23:59:59';
    next_monday TIMESTAMPTZ;
BEGIN
    -- Get current time in SAST (UTC+2)
    current_time := NOW() AT TIME ZONE 'Africa/Johannesburg';
    
    -- Extract day of week (1=Monday, 7=Sunday)
    current_day := EXTRACT(ISODOW FROM current_time);
    current_hour := EXTRACT(HOUR FROM current_time);
    current_minute := EXTRACT(MINUTE FROM current_time);
    
    -- Calculate next Monday at 10:05 SAST
    next_monday := date_trunc('week', current_time) + INTERVAL '7 days' + open_time::INTERVAL;
    
    -- Check if exchange is open (Monday 10:05 - Sunday 23:59)
    IF current_day = 1 AND (current_hour < 10 OR (current_hour = 10 AND current_minute < 5)) THEN
        -- Monday before 10:05 - Exchange is closed
        RETURN QUERY SELECT 
            FALSE,
            'Exchange is CLOSED. Opens Monday at 10:05 SAST for price calculation and order processing.',
            current_time::DATE + open_time::INTERVAL,
            current_time::DATE + close_time::INTERVAL;
    ELSIF current_day = 1 AND (current_hour > 10 OR (current_hour = 10 AND current_minute >= 5)) THEN
        -- Monday after 10:05 - Exchange is open
        RETURN QUERY SELECT 
            TRUE,
            'Exchange is OPEN. Trading and price updates are active.',
            next_monday,
            (current_time::DATE + INTERVAL '6 days') + close_time::INTERVAL;
    ELSIF current_day BETWEEN 2 AND 7 THEN
        -- Tuesday to Sunday - Exchange is open
        RETURN QUERY SELECT 
            TRUE,
            'Exchange is OPEN. Trading and price updates are active.',
            next_monday,
            (current_time::DATE + INTERVAL '1 day') + close_time::INTERVAL;
    ELSE
        -- Fallback case
        RETURN QUERY SELECT 
            FALSE,
            'Exchange status unknown. Please contact support.',
            next_monday,
            current_time + INTERVAL '1 hour';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the weekly price calculation function to use proper decimal precision
CREATE OR REPLACE FUNCTION calculate_weekly_share_price()
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    price_change DECIMAL(10,4),
    j200_growth DECIMAL(10,4)
) AS $$
DECLARE
    current_base_price DECIMAL(10,2);
    latest_j200_growth DECIMAL(10,4);
    calculated_price DECIMAL(10,2);
    calculated_change DECIMAL(10,4);
    effective_date DATE;
BEGIN
    -- Get current Monday's date
    effective_date := date_trunc('week', CURRENT_DATE)::DATE;
    
    -- Get the most recent base price from weekly_prices
    SELECT COALESCE(final_price, 100.00) INTO current_base_price
    FROM weekly_prices 
    ORDER BY effective_date DESC 
    LIMIT 1;
    
    -- Get the latest JSE200 growth rate
    SELECT COALESCE(growth_rate, 0.0000) INTO latest_j200_growth
    FROM JSE200_PriceUpdate_Mondays 
    ORDER BY update_date DESC 
    LIMIT 1;
    
    -- Calculate new price: base_price * (1 + growth_rate/100)
    calculated_price := ROUND(current_base_price * (1 + latest_j200_growth / 100), 2);
    calculated_change := ROUND(calculated_price - current_base_price, 4);
    
    -- Insert or update the weekly price record
    INSERT INTO weekly_prices (
        effective_date,
        base_price,
        j200_growth,
        final_price,
        price_change,
        created_at
    ) VALUES (
        effective_date,
        current_base_price,
        latest_j200_growth,
        calculated_price,
        calculated_change,
        NOW()
    )
    ON CONFLICT (effective_date) 
    DO UPDATE SET
        base_price = EXCLUDED.base_price,
        j200_growth = EXCLUDED.j200_growth,
        final_price = EXCLUDED.final_price,
        price_change = EXCLUDED.price_change,
        created_at = NOW();
    
    RETURN QUERY SELECT 
        TRUE,
        format('Price updated successfully. %s -> %s (change: %s, JSE200: %s%%)', 
               current_base_price, calculated_price, calculated_change, latest_j200_growth),
        current_base_price,
        calculated_price,
        calculated_change,
        latest_j200_growth;
        
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        FALSE,
        format('Error calculating price: %s', SQLERRM),
        current_base_price,
        current_base_price,
        0.0000::DECIMAL(10,4),
        0.0000::DECIMAL(10,4);
END;
$$ LANGUAGE plpgsql;

-- 3. Update the trigger function to use proper decimal formatting
CREATE OR REPLACE FUNCTION trigger_weekly_price_calculation()
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    calc_result RECORD;
BEGIN
    -- Call the price calculation function
    SELECT * INTO calc_result 
    FROM calculate_weekly_share_price() 
    LIMIT 1;
    
    RETURN QUERY SELECT 
        calc_result.success,
        calc_result.message;
        
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        FALSE,
        format('Error triggering price calculation: %s', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 4. Ensure weekly_prices table has correct decimal precision
ALTER TABLE weekly_prices 
    ALTER COLUMN base_price TYPE DECIMAL(10,2),
    ALTER COLUMN final_price TYPE DECIMAL(10,2),
    ALTER COLUMN price_change TYPE DECIMAL(10,4),
    ALTER COLUMN j200_growth TYPE DECIMAL(10,4);

-- 5. Test the timezone fix
SELECT 
    is_open,
    message,
    next_open_time AT TIME ZONE 'Africa/Johannesburg' as next_open_sast,
    next_close_time AT TIME ZONE 'Africa/Johannesburg' as next_close_sast
FROM get_exchange_status();

RAISE NOTICE 'Timezone and decimal precision fixes applied successfully!';
