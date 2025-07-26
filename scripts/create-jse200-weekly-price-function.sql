-- Function to set weekly price from JSE200 data
CREATE OR REPLACE FUNCTION set_weekly_price_from_jse200()
RETURNS void AS $$
DECLARE
    current_monday date;
    jse_price numeric;
    current_hodl numeric;
BEGIN
    -- Get current Monday at 09:00
    current_monday := date_trunc('week', CURRENT_DATE)::date;
    
    -- Fetch the latest price from JSE200_PriceUpdate_Mondays for current Monday
    SELECT price_value INTO jse_price
    FROM JSE200_PriceUpdate_Mondays
    WHERE week_start = current_monday
    AND EXTRACT(hour FROM update_time) = 9
    ORDER BY update_time DESC
    LIMIT 1;
    
    -- If no JSE200 price found for current Monday, try previous Monday
    IF jse_price IS NULL THEN
        SELECT price_value INTO jse_price
        FROM JSE200_PriceUpdate_Mondays
        WHERE week_start = current_monday - INTERVAL '7 days'
        AND EXTRACT(hour FROM update_time) = 9
        ORDER BY update_time DESC
        LIMIT 1;
    END IF;
    
    -- If still no price, use fallback
    IF jse_price IS NULL THEN
        jse_price := 108.20;
        RAISE NOTICE 'No JSE200 price found, using fallback: %', jse_price;
    END IF;
    
    -- Get current HODL percentage for record keeping
    SELECT hodl_percentage INTO current_hodl
    FROM daily_hodl_snapshots
    ORDER BY snapshot_date DESC
    LIMIT 1;
    
    -- Default HODL if none found
    IF current_hodl IS NULL THEN
        current_hodl := 75.0;
    END IF;
    
    -- Insert or update the weekly price
    INSERT INTO weekly_share_prices (
        week_start,
        peg_price,
        average_hodl_percentage,
        calculated_price,
        created_at
    )
    VALUES (
        current_monday,
        jse_price, -- Use JSE200 price as peg price
        current_hodl,
        jse_price, -- Use JSE200 price as calculated price
        now()
    )
    ON CONFLICT (week_start) 
    DO UPDATE SET
        peg_price = EXCLUDED.peg_price,
        calculated_price = EXCLUDED.calculated_price,
        average_hodl_percentage = EXCLUDED.average_hodl_percentage,
        created_at = now();
    
    RAISE NOTICE 'Weekly price updated: % for week starting %', jse_price, current_monday;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_weekly_price_from_jse200() TO authenticated;
GRANT EXECUTE ON FUNCTION set_weekly_price_from_jse200() TO service_role;
