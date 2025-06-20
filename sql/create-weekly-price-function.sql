-- Function to calculate weekly share price
CREATE OR REPLACE FUNCTION calculate_weekly_share_price(peg_price_input numeric DEFAULT 100.00)
RETURNS void AS $$
DECLARE
    week_start_date date;
    avg_hodl_pct numeric;
    calculated_price numeric;
    multiplier numeric;
BEGIN
    -- Get the start of current week (Monday)
    week_start_date := date_trunc('week', CURRENT_DATE)::date;
    
    -- Calculate average HODL percentage from last 7 days
    SELECT AVG(hodl_percentage) INTO avg_hodl_pct
    FROM daily_hodl_snapshots
    WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
    AND snapshot_date < CURRENT_DATE;
    
    -- If no data available, use default 75%
    IF avg_hodl_pct IS NULL THEN
        avg_hodl_pct := 75.0;
    END IF;
    
    -- Apply the pricing formula
    -- multiplier = 1 + (avgHodlPercentage - 50) / 100
    multiplier := 1 + (avg_hodl_pct - 50) / 100;
    calculated_price := peg_price_input * multiplier;
    
    -- Ensure minimum price of N$50
    IF calculated_price < 50 THEN
        calculated_price := 50;
    END IF;
    
    -- Insert or update this week's price
    INSERT INTO weekly_share_prices (
        week_start,
        peg_price,
        average_hodl_percentage,
        calculated_price
    )
    VALUES (
        week_start_date,
        peg_price_input,
        avg_hodl_pct,
        calculated_price
    )
    ON CONFLICT (week_start)
    DO UPDATE SET
        peg_price = EXCLUDED.peg_price,
        average_hodl_percentage = EXCLUDED.average_hodl_percentage,
        calculated_price = EXCLUDED.calculated_price,
        created_at = now();
    
    -- Update the current price in share_supply table
    UPDATE share_supply 
    SET 
        current_price = calculated_price,
        last_price_update = now()
    WHERE id = (SELECT id FROM share_supply ORDER BY created_at DESC LIMIT 1);
    
    RAISE NOTICE 'Weekly price calculated: Week=%, PegPrice=%, AvgHODL=%%, Price=%', 
        week_start_date, peg_price_input, avg_hodl_pct, calculated_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
