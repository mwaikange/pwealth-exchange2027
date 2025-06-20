-- Function to calculate weekly share price (runs every Monday at 09:00 AM)
CREATE OR REPLACE FUNCTION calculate_weekly_share_price()
RETURNS json AS $$
DECLARE
    monday_date date;
    last_final_price numeric;
    current_j200 numeric;
    last_j200 numeric;
    j200_growth_pct numeric;
    avg_hodl_pct numeric;
    base_price numeric;
    multiplier numeric;
    new_final_price numeric;
    price_change numeric;
    result json;
BEGIN
    -- Get the Monday of current week
    monday_date := date_trunc('week', CURRENT_DATE)::date;
    
    -- Get the last final price from previous week
    SELECT final_price INTO last_final_price
    FROM weekly_prices
    WHERE effective_date < monday_date
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- If no previous price, use default base price
    IF last_final_price IS NULL THEN
        last_final_price := 100.00;
    END IF;
    
    -- Get current and previous J200 values
    SELECT j200_index INTO current_j200
    FROM daily_hodl_metrics
    ORDER BY metric_date DESC
    LIMIT 1;
    
    SELECT j200_index INTO last_j200
    FROM daily_hodl_metrics
    WHERE metric_date <= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY metric_date DESC
    LIMIT 1;
    
    -- Calculate J200 growth percentage
    IF last_j200 IS NOT NULL AND last_j200 > 0 THEN
        j200_growth_pct := (current_j200 - last_j200) / last_j200;
    ELSE
        j200_growth_pct := 0.015; -- Default 1.5% growth
    END IF;
    
    -- Calculate 7-day average HODL percentage
    SELECT ROUND(AVG(hodl_percentage), 2) INTO avg_hodl_pct
    FROM daily_hodl_metrics
    WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
    AND metric_date < CURRENT_DATE;
    
    -- If no HODL data, use default 75%
    IF avg_hodl_pct IS NULL THEN
        avg_hodl_pct := 75.0;
    END IF;
    
    -- Calculate new price using the formula
    -- base_price = last_price * (1 + j200_growth)
    -- multiplier = 1 + (hodl_percentage - 50) / 100
    -- final_price = base_price * multiplier
    
    base_price := last_final_price * (1 + j200_growth_pct);
    multiplier := 1 + (avg_hodl_pct - 50) / 100;
    new_final_price := base_price * multiplier;
    
    -- Ensure minimum price of N$50
    IF new_final_price < 50 THEN
        new_final_price := 50;
    END IF;
    
    -- Calculate price change
    price_change := new_final_price - last_final_price;
    
    -- Insert new weekly price
    INSERT INTO weekly_prices (
        effective_date,
        base_price,
        j200_growth,
        hodl_percentage,
        final_price,
        price_change
    )
    VALUES (
        monday_date,
        base_price,
        j200_growth_pct,
        avg_hodl_pct,
        new_final_price,
        price_change
    )
    ON CONFLICT (effective_date)
    DO UPDATE SET
        base_price = EXCLUDED.base_price,
        j200_growth = EXCLUDED.j200_growth,
        hodl_percentage = EXCLUDED.hodl_percentage,
        final_price = EXCLUDED.final_price,
        price_change = EXCLUDED.price_change,
        created_at = now();
    
    -- Update current price in share_supply table if it exists
    UPDATE share_supply 
    SET 
        current_price = new_final_price,
        last_price_update = now()
    WHERE id = (SELECT id FROM share_supply ORDER BY created_at DESC LIMIT 1);
    
    -- Prepare result
    result := json_build_object(
        'success', true,
        'effective_date', monday_date,
        'base_price', base_price,
        'j200_growth', j200_growth_pct,
        'hodl_percentage', avg_hodl_pct,
        'final_price', new_final_price,
        'price_change', price_change,
        'message', 'Weekly share price calculated successfully'
    );
    
    RAISE NOTICE 'Weekly price calculated: Date=%, BasePrice=%, J200Growth=%, HODL=%%, FinalPrice=%, Change=%', 
        monday_date, base_price, j200_growth_pct, avg_hodl_pct, new_final_price, price_change;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
