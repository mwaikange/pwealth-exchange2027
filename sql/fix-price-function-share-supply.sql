-- Fix the get_current_share_price function to pull from share_supply table
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    -- Get the latest share price from share_supply table
    SELECT current_price INTO current_price
    FROM share_supply
    ORDER BY last_price_update DESC
    LIMIT 1;
    
    -- If no price found, return default (shouldn't happen)
    IF current_price IS NULL THEN
        current_price := 100.00;
    END IF;
    
    RETURN current_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a view for easier price access
CREATE OR REPLACE VIEW current_share_price_view AS
SELECT 
    current_price,
    last_price_update,
    total_supply,
    shares_issued
FROM share_supply
ORDER BY last_price_update DESC
LIMIT 1;
