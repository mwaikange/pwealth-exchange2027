-- Fix the get_current_share_price function
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    -- Get the latest share price from weekly_share_prices or use default
    SELECT share_price INTO current_price
    FROM weekly_share_prices
    WHERE week_start <= CURRENT_DATE
    ORDER BY week_start DESC
    LIMIT 1;
    
    -- If no price found, return default
    IF current_price IS NULL THEN
        current_price := 100.00;
    END IF;
    
    RETURN current_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: If weekly_share_prices doesn't exist, create simple version
CREATE OR REPLACE FUNCTION get_current_share_price_simple()
RETURNS NUMERIC AS $$
BEGIN
    -- Return fixed price for now
    RETURN 100.00;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
