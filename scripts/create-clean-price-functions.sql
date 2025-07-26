-- Create clean price functions without HODL dependencies and with NaN protection

-- 1. Get current share price with NaN protection
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    SELECT COALESCE(final_price, 108.2) INTO current_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Additional NaN protection
    IF current_price IS NULL OR current_price <= 0 THEN
        current_price := 108.2;
    END IF;
    
    RETURN current_price;
END;
$$;

-- 2. Get price history without HODL data
CREATE OR REPLACE FUNCTION get_price_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    effective_date DATE,
    base_price NUMERIC,
    j200_growth NUMERIC,
    final_price NUMERIC,
    price_change NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wp.effective_date,
        COALESCE(wp.base_price, 108.2) as base_price,
        COALESCE(wp.j200_growth, 0.0) as j200_growth,
        COALESCE(wp.final_price, 108.2) as final_price,
        COALESCE(wp.price_change, 0.0) as price_change,
        wp.created_at
    FROM weekly_prices wp
    WHERE wp.effective_date >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ORDER BY wp.effective_date DESC;
END;
$$;

-- 3. Calculate weekly share price from JSE200 (main calculation function)
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_from_jse200()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    latest_jse_record RECORD;
    previous_price NUMERIC;
    new_price NUMERIC;
    price_change NUMERIC;
    result JSON;
BEGIN
    -- Get the latest JSE200 data
    SELECT * INTO latest_jse_record
    FROM "JSE200_PriceUpdate_Mondays"
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF latest_jse_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No JSE200 data available'
        );
    END IF;
    
    -- Get the previous week's price (fallback to base price)
    SELECT COALESCE(final_price, 108.2) INTO previous_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    IF previous_price IS NULL OR previous_price <= 0 THEN
        previous_price := 108.2;
    END IF;
    
    -- Calculate new price based on JSE200 percentage change
    new_price := previous_price * (1 + COALESCE(latest_jse_record.percentage_change, 0) / 100);
    
    -- Ensure minimum price
    IF new_price <= 0 THEN
        new_price := 108.2;
    END IF;
    
    price_change := new_price - previous_price;
    
    -- Insert new price record
    INSERT INTO weekly_prices (
        effective_date,
        base_price,
        j200_growth,
        final_price,
        price_change,
        created_at
    ) VALUES (
        CURRENT_DATE,
        previous_price,
        COALESCE(latest_jse_record.percentage_change, 0) / 100,
        new_price,
        price_change,
        NOW()
    );
    
    result := json_build_object(
        'success', true,
        'message', 'Price calculated successfully',
        'previous_price', previous_price,
        'new_price', new_price,
        'price_change', price_change,
        'jse200_change', COALESCE(latest_jse_record.percentage_change, 0),
        'effective_date', CURRENT_DATE
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error calculating price: ' || SQLERRM
        );
END;
$$;

-- 4. Manual trigger for price calculation
CREATE OR REPLACE FUNCTION trigger_weekly_price_calculation()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN calculate_weekly_share_price_from_jse200();
END;
$$;

-- 5. Get price system health
CREATE OR REPLACE FUNCTION get_price_system_health()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_price NUMERIC;
    latest_jse RECORD;
    price_count INTEGER;
    result JSON;
BEGIN
    -- Get current price
    current_price := get_current_share_price();
    
    -- Get latest JSE200 data
    SELECT * INTO latest_jse
    FROM "JSE200_PriceUpdate_Mondays"
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Count price records
    SELECT COUNT(*) INTO price_count
    FROM weekly_prices;
    
    result := json_build_object(
        'system_status', 'healthy',
        'current_price', current_price,
        'price_records_count', price_count,
        'latest_jse200', CASE 
            WHEN latest_jse IS NOT NULL THEN row_to_json(latest_jse)
            ELSE NULL
        END,
        'last_updated', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'system_status', 'error',
            'error_message', SQLERRM,
            'current_price', 108.2,
            'last_updated', NOW()
        );
END;
$$;

-- 6. Cron functions for Vercel integration
CREATE OR REPLACE FUNCTION handle_weekly_price_cron()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    current_timestamp TIMESTAMPTZ := NOW();
    current_day TEXT := TRIM(TO_CHAR(current_timestamp, 'Day'));
    current_hour INTEGER := EXTRACT(HOUR FROM current_timestamp);
    current_minute INTEGER := EXTRACT(MINUTE FROM current_timestamp);
BEGIN
    -- Check window for Monday 09:10–09:20
    IF current_day = 'Monday' AND current_hour = 9 AND current_minute BETWEEN 10 AND 20 THEN
        result := calculate_weekly_share_price_from_jse200();
        result := result || json_build_object(
            'executed_at', current_timestamp,
            'execution_context', 'vercel_cron',
            'day_check', 'Monday - OK',
            'time_check', format('09:%s - OK', current_minute)
        );
        RETURN result;
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', 'Not executed - outside Monday 09:10-09:20 window',
            'current_time', current_timestamp,
            'current_day', current_day,
            'current_hour', current_hour,
            'current_minute', current_minute,
            'expected', 'Monday between 09:10-09:20'
        );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION handle_manual_price_cron()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON := calculate_weekly_share_price_from_jse200();
BEGIN
    result := result || json_build_object(
        'executed_at', NOW(),
        'execution_context', 'manual_trigger',
        'note', 'Time checks bypassed for manual execution'
    );
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_cron_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    latest_jse RECORD;
    latest_price RECORD;
    next_monday DATE := DATE_TRUNC('week', CURRENT_DATE + INTERVAL '7 days')::DATE;
BEGIN
    SELECT * INTO latest_jse
    FROM "JSE200_PriceUpdate_Mondays"
    ORDER BY created_at DESC
    LIMIT 1;
    
    SELECT * INTO latest_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    RETURN json_build_object(
        'current_time', NOW(),
        'next_execution', next_monday || ' 09:15:00',
        'latest_jse200', CASE WHEN latest_jse IS NOT NULL THEN row_to_json(latest_jse) ELSE NULL END,
        'latest_price', CASE WHEN latest_price IS NOT NULL THEN row_to_json(latest_price) ELSE NULL END,
        'current_share_price', get_current_share_price(),
        'system_status', 'ready'
    );
END;
$$;

CREATE OR REPLACE FUNCTION api_weekly_price_endpoint(action_param TEXT DEFAULT 'status')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    CASE action_param
        WHEN 'calculate' THEN
            RETURN handle_weekly_price_cron();
        WHEN 'manual' THEN
            RETURN handle_manual_price_cron();
        WHEN 'status' THEN
            RETURN get_cron_status();
        WHEN 'current_price' THEN
            RETURN json_build_object(
                'current_price', get_current_share_price(),
                'timestamp', NOW()
            );
        ELSE
            RETURN json_build_object(
                'error', 'Invalid action',
                'available_actions', ARRAY['calculate', 'manual', 'status', 'current_price']
            );
    END CASE;
END;
$$;

-- Add comments
COMMENT ON FUNCTION get_current_share_price() IS 'Returns current share price with NaN protection - HODL removed';
COMMENT ON FUNCTION get_price_history(INTEGER) IS 'Returns price history without HODL data';
COMMENT ON FUNCTION calculate_weekly_share_price_from_jse200() IS 'Main price calculation based purely on JSE200 changes';
COMMENT ON FUNCTION handle_weekly_price_cron() IS 'Handles Vercel cron requests - only executes on Monday 09:10-09:20';
COMMENT ON FUNCTION handle_manual_price_cron() IS 'Manual trigger for testing - bypasses time checks';
COMMENT ON FUNCTION get_cron_status() IS 'Returns current system status and next execution time';
COMMENT ON FUNCTION api_weekly_price_endpoint(TEXT) IS 'Main API endpoint function for Vercel integration';
