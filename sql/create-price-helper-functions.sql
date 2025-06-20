-- Function to get the latest share price
CREATE OR REPLACE FUNCTION get_latest_share_price()
RETURNS numeric AS $$
DECLARE
    latest_price numeric;
BEGIN
    -- Get the most recent final price
    SELECT final_price INTO latest_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- If no price found, return default
    IF latest_price IS NULL THEN
        latest_price := 108.2; -- Current default price
    END IF;
    
    RETURN latest_price;
END;
$$ LANGUAGE plpgsql;

-- Function to get current HODL percentage
CREATE OR REPLACE FUNCTION get_current_hodl_percentage()
RETURNS numeric AS $$
DECLARE
    current_hodl numeric;
BEGIN
    -- Get the most recent HODL percentage
    SELECT hodl_percentage INTO current_hodl
    FROM daily_hodl_metrics
    ORDER BY metric_date DESC
    LIMIT 1;
    
    -- If no data, return default
    IF current_hodl IS NULL THEN
        current_hodl := 75.0;
    END IF;
    
    RETURN current_hodl;
END;
$$ LANGUAGE plpgsql;

-- Function to get price history for charts
CREATE OR REPLACE FUNCTION get_price_history(days_back integer DEFAULT 30)
RETURNS TABLE(
    date date,
    price numeric,
    hodl_percentage numeric,
    j200_growth numeric,
    price_change numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wp.effective_date as date,
        wp.final_price as price,
        wp.hodl_percentage,
        wp.j200_growth,
        wp.price_change
    FROM weekly_prices wp
    WHERE wp.effective_date >= CURRENT_DATE - (days_back || ' days')::interval
    ORDER BY wp.effective_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get HODL metrics history
CREATE OR REPLACE FUNCTION get_hodl_history(days_back integer DEFAULT 7)
RETURNS TABLE(
    date date,
    total_shares numeric,
    shares_on_sale numeric,
    hodl_percentage numeric,
    j200_index numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dhm.metric_date as date,
        dhm.total_shares,
        dhm.shares_on_sale,
        dhm.hodl_percentage,
        dhm.j200_index
    FROM daily_hodl_metrics dhm
    WHERE dhm.metric_date >= CURRENT_DATE - (days_back || ' days')::interval
    ORDER BY dhm.metric_date DESC;
END;
$$ LANGUAGE plpgsql;
