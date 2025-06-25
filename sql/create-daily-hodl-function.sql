-- Function to calculate and store daily HODL metrics
CREATE OR REPLACE FUNCTION calculate_daily_hodl_metrics()
RETURNS json AS $$
DECLARE
    total_shares_count numeric;
    shares_for_sale numeric;
    hodl_pct numeric;
    today_date date;
    j200_value numeric;
    result json;
BEGIN
    today_date := CURRENT_DATE;
    
    -- Get total shares from all user wallets
    SELECT COALESCE(SUM(shares), 0) INTO total_shares_count
    FROM user_shares
    WHERE wallet_type IN ('hold_pre', 'hold_post', 'cashout_wallet');
    
    -- Get shares currently listed for sale
    SELECT COALESCE(SUM(shares), 0) INTO shares_for_sale
    FROM sell_orders
    WHERE status = 'open' AND expires_at > now();
    
    -- Calculate HODL percentage
    IF total_shares_count > 0 THEN
        hodl_pct := ROUND(((total_shares_count - shares_for_sale) / total_shares_count) * 100, 2);
    ELSE
        hodl_pct := 100.0; -- If no shares exist, HODL is 100%
    END IF;
    
    -- Mock J200 index value (in real implementation, this would be fetched from external API)
    j200_value := 100.0 + (EXTRACT(DOY FROM today_date) * 0.1); -- Simple mock growth
    
    -- Insert or update today's metrics
    INSERT INTO daily_hodl_metrics (
        metric_date,
        total_shares,
        shares_on_sale,
        hodl_percentage,
        j200_index
    )
    VALUES (
        today_date,
        total_shares_count,
        shares_for_sale,
        hodl_pct,
        j200_value
    )
    ON CONFLICT (metric_date)
    DO UPDATE SET
        total_shares = EXCLUDED.total_shares,
        shares_on_sale = EXCLUDED.shares_on_sale,
        hodl_percentage = EXCLUDED.hodl_percentage,
        j200_index = EXCLUDED.j200_index,
        created_at = now();
    
    -- Prepare result
    result := json_build_object(
        'success', true,
        'date', today_date,
        'total_shares', total_shares_count,
        'shares_on_sale', shares_for_sale,
        'hodl_percentage', hodl_pct,
        'j200_index', j200_value,
        'message', 'Daily HODL metrics calculated successfully'
    );
    
    RAISE NOTICE 'Daily HODL metrics: Date=%, Total=%, OnSale=%, HODL=%%, J200=%', 
        today_date, total_shares_count, shares_for_sale, hodl_pct, j200_value;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
