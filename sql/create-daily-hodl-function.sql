-- Function to calculate and store daily HODL snapshot
CREATE OR REPLACE FUNCTION calculate_daily_hodl_snapshot()
RETURNS void AS $$
DECLARE
    total_shares numeric;
    listed_shares numeric;
    hodl_pct numeric;
    today_date date;
BEGIN
    today_date := CURRENT_DATE;
    
    -- Get total shares from supply
    SELECT total_supply INTO total_shares
    FROM share_supply
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Calculate shares listed for sale (mock calculation for now)
    -- In real implementation, this would sum from active sell orders
    listed_shares := total_shares * 0.25; -- Assume 25% are listed for sale
    
    -- Calculate HODL percentage
    hodl_pct := ((total_shares - listed_shares) / total_shares) * 100;
    
    -- Insert or update today's snapshot
    INSERT INTO daily_hodl_snapshots (
        snapshot_date,
        shares_total,
        shares_listed_for_sale,
        hodl_percentage
    )
    VALUES (
        today_date,
        total_shares,
        listed_shares,
        hodl_pct
    )
    ON CONFLICT (snapshot_date)
    DO UPDATE SET
        shares_total = EXCLUDED.shares_total,
        shares_listed_for_sale = EXCLUDED.shares_listed_for_sale,
        hodl_percentage = EXCLUDED.hodl_percentage,
        created_at = now();
        
    RAISE NOTICE 'Daily HODL snapshot created: Date=%, Total=%, Listed=%, HODL=%', 
        today_date, total_shares, listed_shares, hodl_pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
