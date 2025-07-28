-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS calculate_weekly_share_price_simplified();
DROP FUNCTION IF EXISTS get_current_share_price();
DROP FUNCTION IF EXISTS get_price_history(integer);

-- Create simplified weekly price calculation function
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_simplified()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    latest_jse200 RECORD;
    previous_weekly RECORD;
    new_base_price NUMERIC := 100.00; -- Fallback base price
    new_j200_growth NUMERIC;
    new_final_price NUMERIC;
    new_price_change NUMERIC;
    result_data jsonb;
BEGIN
    -- Log start of calculation
    RAISE NOTICE 'Starting simplified weekly price calculation at %', NOW();
    
    -- 1. Get the latest JSE200 update
    SELECT 
        price,
        percent_change,
        week_start_date,
        created_at
    INTO latest_jse200
    FROM JSE200_PriceUpdate_Mondays
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if we have JSE200 data
    IF latest_jse200 IS NULL THEN
        RAISE EXCEPTION 'No JSE200 data found in JSE200_PriceUpdate_Mondays table';
    END IF;
    
    RAISE NOTICE 'Latest JSE200 data: price=%, percent_change=%, date=%', 
        latest_jse200.price, latest_jse200.percent_change, latest_jse200.week_start_date;
    
    -- 2. Get the previous week's final price as base price
    SELECT 
        final_price,
        effective_date
    INTO previous_weekly
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Set base price (use previous final_price or fallback to 100.00)
    IF previous_weekly IS NOT NULL THEN
        new_base_price := previous_weekly.final_price;
        RAISE NOTICE 'Using previous final_price as base: %', new_base_price;
    ELSE
        RAISE NOTICE 'No previous weekly_prices found, using fallback base_price: %', new_base_price;
    END IF;
    
    -- 3. Use JSE200 percent_change as j200_growth
    new_j200_growth := COALESCE(latest_jse200.percent_change, 0);
    
    -- 4. Calculate new final_price: base_price * (1 + (j200_growth / 100))
    new_final_price := new_base_price * (1 + (new_j200_growth / 100));
    
    -- 5. Calculate price_change: final_price - base_price
    new_price_change := new_final_price - new_base_price;
    
    RAISE NOTICE 'Calculated values: base_price=%, j200_growth=%, final_price=%, price_change=%',
        new_base_price, new_j200_growth, new_final_price, new_price_change;
    
    -- 6. Insert new row into weekly_prices
    INSERT INTO weekly_prices (
        effective_date,
        base_price,
        j200_growth,
        final_price,
        price_change,
        created_at
    ) VALUES (
        CURRENT_DATE,
        new_base_price,
        new_j200_growth,
        new_final_price,
        new_price_change,
        NOW()
    );
    
    -- Prepare result data
    result_data := jsonb_build_object(
        'success', true,
        'calculation_date', CURRENT_DATE,
        'jse200_data', jsonb_build_object(
            'price', latest_jse200.price,
            'percent_change', latest_jse200.percent_change,
            'week_start_date', latest_jse200.week_start_date
        ),
        'price_calculation', jsonb_build_object(
            'base_price', new_base_price,
            'j200_growth', new_j200_growth,
            'final_price', new_final_price,
            'price_change', new_price_change
        ),
        'message', 'Weekly share price calculated successfully using JSE200 data'
    );
    
    RAISE NOTICE 'Weekly price calculation completed successfully';
    
    RETURN result_data;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in weekly price calculation: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'calculation_date', CURRENT_DATE
        );
END;
$$;

-- Create function to get current share price
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    -- Get the latest final_price from weekly_prices
    SELECT final_price
    INTO current_price
    FROM weekly_prices
    ORDER BY effective_date DESC, created_at DESC
    LIMIT 1;
    
    -- Return current price or fallback to 108.20
    RETURN COALESCE(current_price, 108.20);
END;
$$;

-- Create function to get price history
CREATE OR REPLACE FUNCTION get_price_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    date DATE,
    price NUMERIC,
    j200_growth NUMERIC,
    price_change NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wp.effective_date as date,
        wp.final_price as price,
        wp.j200_growth,
        wp.price_change,
        wp.created_at
    FROM weekly_prices wp
    WHERE wp.effective_date >= (CURRENT_DATE - INTERVAL '1 day' * days_back)
    ORDER BY wp.effective_date DESC, wp.created_at DESC
    LIMIT 50;
END;
$$;

-- Create manual trigger function for testing
CREATE OR REPLACE FUNCTION trigger_weekly_price_calculation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE NOTICE 'Manual trigger for weekly price calculation';
    RETURN calculate_weekly_share_price_simplified();
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_weekly_share_price_simplified() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_current_share_price() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_price_history(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION trigger_weekly_price_calculation() TO authenticated, anon;

-- Log completion
SELECT 'Simplified price calculation functions created successfully' as status;
