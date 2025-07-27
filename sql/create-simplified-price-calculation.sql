-- Drop existing functions that are no longer needed
DROP FUNCTION IF EXISTS calculate_weekly_share_price();
DROP FUNCTION IF EXISTS calculate_weekly_share_price_from_jse200();

-- Create simplified weekly share price calculation function
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_simplified()
RETURNS json AS $$
DECLARE
    latest_jse200 RECORD;
    last_weekly_price RECORD;
    new_base_price numeric;
    new_j200_growth numeric;
    new_final_price numeric;
    new_price_change numeric;
    current_monday date;
    result json;
BEGIN
    -- Get current Monday date
    current_monday := date_trunc('week', CURRENT_DATE)::date;
    
    -- Get the latest JSE200 update
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
    
    -- Get the last week's final price as base price
    SELECT 
        final_price,
        effective_date
    INTO last_weekly_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Set base price (fallback to 100.00 if no previous data)
    IF last_weekly_price IS NULL THEN
        new_base_price := 100.00;
        RAISE NOTICE 'No previous weekly price found, using fallback base price: %', new_base_price;
    ELSE
        new_base_price := last_weekly_price.final_price;
        RAISE NOTICE 'Using previous final price as base: %', new_base_price;
    END IF;
    
    -- Use JSE200 percent change as j200_growth
    new_j200_growth := latest_jse200.percent_change;
    
    -- Calculate new final price: base_price * (1 + (j200_growth / 100))
    new_final_price := new_base_price * (1 + (new_j200_growth / 100));
    
    -- Ensure minimum price of N$50
    IF new_final_price < 50 THEN
        new_final_price := 50;
        RAISE NOTICE 'Applied minimum price floor of N$50';
    END IF;
    
    -- Calculate price change
    new_price_change := new_final_price - new_base_price;
    
    -- Insert new weekly price record
    INSERT INTO weekly_prices (
        effective_date,
        base_price,
        j200_growth,
        final_price,
        price_change,
        created_at
    )
    VALUES (
        current_monday,
        new_base_price,
        new_j200_growth,
        new_final_price,
        new_price_change,
        now()
    )
    ON CONFLICT (effective_date)
    DO UPDATE SET
        base_price = EXCLUDED.base_price,
        j200_growth = EXCLUDED.j200_growth,
        final_price = EXCLUDED.final_price,
        price_change = EXCLUDED.price_change,
        created_at = now();
    
    -- Prepare result
    result := json_build_object(
        'success', true,
        'effective_date', current_monday,
        'base_price', new_base_price,
        'j200_growth', new_j200_growth,
        'final_price', new_final_price,
        'price_change', new_price_change,
        'jse200_price', latest_jse200.price,
        'jse200_date', latest_jse200.week_start_date,
        'message', 'Weekly share price calculated successfully using simplified JSE200 method'
    );
    
    RAISE NOTICE 'Weekly price calculated: Date=%, BasePrice=%, JSE200Growth=%, FinalPrice=%, Change=%', 
        current_monday, new_base_price, new_j200_growth, new_final_price, new_price_change;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get current share price
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS numeric AS $$
DECLARE
    current_price numeric;
BEGIN
    -- Get the latest final price from weekly_prices
    SELECT final_price INTO current_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Return fallback price if no data found
    IF current_price IS NULL THEN
        current_price := 108.2;
    END IF;
    
    RETURN current_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get latest share price with metadata
CREATE OR REPLACE FUNCTION get_latest_share_price()
RETURNS numeric AS $$
BEGIN
    RETURN get_current_share_price();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get price history
CREATE OR REPLACE FUNCTION get_price_history(days_back integer DEFAULT 30)
RETURNS TABLE(
    date date,
    price numeric,
    j200_growth numeric,
    price_change numeric,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wp.effective_date as date,
        wp.final_price as price,
        wp.j200_growth,
        wp.price_change,
        wp.created_at
    FROM weekly_prices wp
    WHERE wp.effective_date >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ORDER BY wp.effective_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_weekly_share_price_simplified() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_share_price() TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_share_price() TO authenticated;
GRANT EXECUTE ON FUNCTION get_price_history(integer) TO authenticated;
