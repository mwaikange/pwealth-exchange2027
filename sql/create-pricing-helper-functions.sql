-- Get current share price based on the pricing engine
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
    current_price NUMERIC;
    fallback_price NUMERIC := 108.20; -- Starting price
BEGIN
    -- Try to get the most recent calculated price from weekly_share_prices
    SELECT calculated_price 
    FROM weekly_share_prices 
    WHERE week_start <= CURRENT_DATE
    ORDER BY week_start DESC 
    LIMIT 1
    INTO current_price;
    
    -- If no price found, try to get from current_pricing_info view
    IF current_price IS NULL THEN
        SELECT current_price 
        FROM current_pricing_info 
        LIMIT 1
        INTO current_price;
    END IF;
    
    -- Return the price or fallback
    RETURN COALESCE(current_price, fallback_price);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
