-- Fix timezone issues and decimal precision for price calculations
-- This script addresses the "dow" unit error and ensures proper decimal formatting

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
    next_monday DATE;
BEGIN
    -- Get current time in SAST (UTC+2)
    current_time := NOW() AT TIME ZONE 'Africa/Johannesburg';
    
    -- Extract day of week (1=Monday, 7=Sunday)
    current_day := EXTRACT(ISODOW FROM current_time);
    current_hour := EXTRACT(HOUR FROM current_time);
    current_minute := EXTRACT(MINUTE FROM current_time);
    
    -- Calculate next Monday
    next_monday := CASE 
        WHEN current_day = 1 THEN current_time::DATE
        ELSE (current_time::DATE + INTERVAL '1 week')::DATE - INTERVAL '6 days'
    END;
    
    -- Check if exchange is open (Monday 10:05 - 23:59)
    IF current_day = 1 AND 
       (current_hour > 10 OR (current_hour = 10 AND current_minute >= 5)) AND
       current_hour < 24 THEN
        -- Exchange is OPEN
        RETURN QUERY SELECT 
            TRUE as is_open,
            'Exchange is OPEN for trading. Orders can be placed and matched.' as message,
            NULL::TIMESTAMPTZ as next_open_time,
            (current_time::DATE + close_time)::TIMESTAMPTZ as next_close_time;
    ELSE
        -- Exchange is CLOSED
        RETURN QUERY SELECT 
            FALSE as is_open,
            CASE 
                WHEN current_day = 1 AND current_hour < 10 THEN
                    'Exchange opens today at 10:05 SAST. Price calculation and order cleanup in progress.'
                WHEN current_day = 1 AND current_hour = 10 AND current_minute < 5 THEN
                    'Exchange opens in ' || (5 - current_minute) || ' minutes at 10:05 SAST.'
                ELSE
                    'Exchange is CLOSED. Opens next Monday at 10:05 SAST.'
            END as message,
            (next_monday + open_time)::TIMESTAMPTZ as next_open_time,
            NULL::TIMESTAMPTZ as next_close_time;
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
    effective_date := CASE 
        WHEN EXTRACT(ISODOW FROM CURRENT_DATE) = 1 THEN CURRENT_DATE
        ELSE CURRENT_DATE - INTERVAL '1 day' * (EXTRACT(ISODOW FROM CURRENT_DATE) - 1)
    END;
    
    -- Check if price already calculated for this week
    IF EXISTS (
        SELECT 1 FROM weekly_prices 
        WHERE effective_date = calculate_weekly_share_price.effective_date
    ) THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'Price already calculated for ' || effective_date::TEXT as message,
            NULL::DECIMAL(10,2) as old_price,
            NULL::DECIMAL(10,2) as new_price,
            NULL::DECIMAL(10,4) as price_change,
            NULL::DECIMAL(10,4) as j200_growth;
        RETURN;
    END IF;
    
    -- Get the most recent base price (previous week's final price)
    SELECT COALESCE(final_price, 100.00) INTO current_base_price
    FROM weekly_prices 
    ORDER BY effective_date DESC 
    LIMIT 1;
    
    -- Get the latest JSE200 growth from the correct table
    SELECT COALESCE(growth_percentage, 0.0000) INTO latest_j200_growth
    FROM JSE200_PriceUpdate_Mondays 
    ORDER BY date DESC 
    LIMIT 1;
    
    -- Calculate new price: base_price * (1 + j200_growth/100)
    calculated_price := ROUND(current_base_price * (1 + latest_j200_growth / 100), 2);
    calculated_change := ROUND(calculated_price - current_base_price, 4);
    
    -- Insert the new price record
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
    );
    
    RETURN QUERY SELECT 
        TRUE as success,
        'Weekly price calculated successfully for ' || effective_date::TEXT as message,
        current_base_price as old_price,
        calculated_price as new_price,
        calculated_change as price_change,
        latest_j200_growth as j200_growth;
        
END;
$$ LANGUAGE plpgsql;

-- 3. Update the trigger function for manual price calculation
CREATE OR REPLACE FUNCTION trigger_weekly_price_calculation()
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    calculation_details JSONB
) AS $$
DECLARE
    calc_result RECORD;
    details JSONB;
BEGIN
    -- Call the price calculation function
    SELECT * INTO calc_result FROM calculate_weekly_share_price() LIMIT 1;
    
    -- Build details JSON
    details := jsonb_build_object(
        'old_price', calc_result.old_price,
        'new_price', calc_result.new_price,
        'price_change', calc_result.price_change,
        'j200_growth', calc_result.j200_growth,
        'timestamp', NOW()
    );
    
    RETURN QUERY SELECT 
        calc_result.success,
        calc_result.message,
        details as calculation_details;
END;
$$ LANGUAGE plpgsql;

-- 4. Ensure proper decimal formatting in get_current_share_price
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS DECIMAL(10,2) AS $$
DECLARE
    current_price DECIMAL(10,2);
BEGIN
    SELECT COALESCE(final_price, 100.00) INTO current_price
    FROM weekly_prices 
    ORDER BY effective_date DESC 
    LIMIT 1;
    
    RETURN ROUND(current_price, 2);
END;
$$ LANGUAGE plpgsql;

-- 5. Update get_price_history to return properly formatted decimals
CREATE OR REPLACE FUNCTION get_price_history(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    effective_date DATE,
    base_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    price_change DECIMAL(10,4),
    j200_growth DECIMAL(10,4),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wp.effective_date,
        ROUND(wp.base_price, 2) as base_price,
        ROUND(wp.final_price, 2) as final_price,
        ROUND(wp.price_change, 4) as price_change,
        ROUND(wp.j200_growth, 4) as j200_growth,
        wp.created_at
    FROM weekly_prices wp
    ORDER BY wp.effective_date DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Test the fixes
DO $$
DECLARE
    status_result RECORD;
BEGIN
    RAISE NOTICE '=== Testing Exchange Status Function ===';
    
    SELECT * INTO status_result FROM get_exchange_status() LIMIT 1;
    
    RAISE NOTICE 'Exchange Status: %', CASE WHEN status_result.is_open THEN 'OPEN' ELSE 'CLOSED' END;
    RAISE NOTICE 'Message: %', status_result.message;
    
    IF status_result.next_open_time IS NOT NULL THEN
        RAISE NOTICE 'Next Open: %', status_result.next_open_time;
    END IF;
    
    IF status_result.next_close_time IS NOT NULL THEN
        RAISE NOTICE 'Next Close: %', status_result.next_close_time;
    END IF;
    
    RAISE NOTICE '=== Exchange Status Test Complete ===';
END;
$$;
