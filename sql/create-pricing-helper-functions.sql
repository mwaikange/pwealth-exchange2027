-- Function to get current week's share price
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS numeric AS $$
DECLARE
    current_price numeric;
BEGIN
    -- Get the current week's calculated price
    SELECT calculated_price INTO current_price
    FROM weekly_share_prices
    WHERE week_start = date_trunc('week', CURRENT_DATE)::date;
    
    -- If no price for current week, get the most recent price
    IF current_price IS NULL THEN
        SELECT calculated_price INTO current_price
        FROM weekly_share_prices
        ORDER BY week_start DESC
        LIMIT 1;
    END IF;
    
    -- If still no price, return default
    IF current_price IS NULL THEN
        current_price := 100.00;
    END IF;
    
    RETURN current_price;
END;
$$ LANGUAGE plpgsql;

-- Function to get current HODL percentage
CREATE OR REPLACE FUNCTION get_current_hodl_percentage()
RETURNS numeric AS $$
DECLARE
    hodl_pct numeric;
BEGIN
    -- Get the most recent HODL percentage
    SELECT hodl_percentage INTO hodl_pct
    FROM daily_hodl_snapshots
    ORDER BY snapshot_date DESC
    LIMIT 1;
    
    -- If no data, return default
    IF hodl_pct IS NULL THEN
        hodl_pct := 75.0;
    END IF;
    
    RETURN hodl_pct;
END;
$$ LANGUAGE plpgsql;

-- Function to get pricing history
CREATE OR REPLACE FUNCTION get_pricing_history(days_back integer DEFAULT 30)
RETURNS TABLE(
    date date,
    price numeric,
    hodl_percentage numeric,
    peg_price numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wsp.week_start as date,
        wsp.calculated_price as price,
        wsp.average_hodl_percentage as hodl_percentage,
        wsp.peg_price
    FROM weekly_share_prices wsp
    WHERE wsp.week_start >= CURRENT_DATE - (days_back || ' days')::interval
    ORDER BY wsp.week_start DESC;
END;
$$ LANGUAGE plpgsql;
