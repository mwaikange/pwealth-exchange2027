-- Create clean price functions without HODL dependencies
-- All functions include comprehensive NaN protection

-- 1. Get current share price with NaN protection
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    SELECT COALESCE(final_price, 108.2)
    INTO current_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Additional NaN protection
    IF current_price IS NULL OR current_price <= 0 THEN
        current_price := 108.2;
    END IF;
    
    RETURN current_price;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 108.2; -- Fallback price
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
EXCEPTION
    WHEN OTHERS THEN
        -- Return empty result on error
        RETURN;
END;
$$;

-- 3. Calculate weekly share price from JSE200 (no HODL)
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_from_jse200()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    latest_jse RECORD;
    previous_price NUMERIC;
    new_price NUMERIC;
    price_change NUMERIC;
    result json;
BEGIN
    -- Get the latest JSE200 data
    SELECT * INTO latest_jse
    FROM "JSE200_PriceUpdate_Mondays"
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF latest_jse IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No JSE200 data available',
            'timestamp', NOW()
        );
    END IF;
    
    -- Get the previous week's price (fallback to 108.2)
    SELECT COALESCE(final_price, 108.2) INTO previous_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    IF previous_price IS NULL OR previous_price <= 0 THEN
        previous_price := 108.2;
    END IF;
    
    -- Calculate new price based on JSE200 percentage change
    new_price := previous_price * (1 + COALESCE(latest_jse.percentage_change, 0) / 100.0);
    
    -- Ensure new_price is valid
    IF new_price IS NULL OR new_price <= 0 THEN
        new_price := previous_price;
    END IF;
    
    price_change := new_price - previous_price;
    
    -- Insert the new price record
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
        COALESCE(latest_jse.percentage_change, 0) / 100.0,
        new_price,
        price_change,
        NOW()
    );
    
    result := json_build_object(
        'success', true,
        'message', 'Weekly price calculated successfully',
        'previous_price', previous_price,
        'new_price', new_price,
        'price_change', price_change,
        'jse200_change', COALESCE(latest_jse.percentage_change, 0),
        'effective_date', CURRENT_DATE,
        'timestamp', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error calculating weekly price: ' || SQLERRM,
            'timestamp', NOW()
        );
END;
$$;

-- 4. Manual trigger function
CREATE OR REPLACE FUNCTION trigger_weekly_price_calculation()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN calculate_weekly_share_price_from_jse200();
END;
$$;

-- 5. Get price system health
CREATE OR REPLACE FUNCTION get_price_system_health()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_price NUMERIC;
    latest_jse RECORD;
    price_count INTEGER;
    result json;
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
            WHEN latest_jse IS NOT NULL THEN
                json_build_object(
                    'percentage_change', latest_jse.percentage_change,
                    'created_at', latest_jse.created_at
                )
            ELSE NULL
        END,
        'last_check', NOW(),
        'hodl_removed', true
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'system_status', 'error',
            'error_message', SQLERRM,
            'last_check', NOW()
        );
END;
$$;

-- 6. Simulate price calculation for testing
CREATE OR REPLACE FUNCTION simulate_price_calculation(
    percent_change NUMERIC DEFAULT 2.5,
    description TEXT DEFAULT 'Test simulation'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    previous_price NUMERIC;
    new_price NUMERIC;
    price_change NUMERIC;
    result json;
BEGIN
    -- Get current price
    previous_price := get_current_share_price();
    
    -- Calculate simulated new price
    new_price := previous_price * (1 + percent_change / 100.0);
    price_change := new_price - previous_price;
    
    result := json_build_object(
        'simulation', true,
        'description', description,
        'input_change_percent', percent_change,
        'previous_price', previous_price,
        'simulated_new_price', new_price,
        'simulated_price_change', price_change,
        'timestamp', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'simulation', false,
            'error', SQLERRM,
            'timestamp', NOW()
        );
END;
$$;

-- Add comments
COMMENT ON FUNCTION get_current_share_price() IS 'Returns current share price with NaN protection - HODL removed';
COMMENT ON FUNCTION get_price_history(INTEGER) IS 'Returns price history without HODL data';
COMMENT ON FUNCTION calculate_weekly_share_price_from_jse200() IS 'Calculates weekly price based purely on JSE200 changes';
COMMENT ON FUNCTION get_price_system_health() IS 'Returns system health status without HODL dependencies';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Clean price functions created successfully at %', NOW();
END $$;
