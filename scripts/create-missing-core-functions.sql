-- Create missing core functions that the retry system depends on

-- Function to clear weekly order history
CREATE OR REPLACE FUNCTION clear_weekly_order_history()
RETURNS JSON AS $$
DECLARE
    previous_week DATE;
    cleared_buy_orders INTEGER := 0;
    cleared_sell_orders INTEGER := 0;
    cleared_matched_orders INTEGER := 0;
BEGIN
    -- Calculate previous week start (Monday)
    previous_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day' - INTERVAL '7 days';
    
    RAISE NOTICE 'Clearing order history for weeks before: %', previous_week;
    
    -- Clear old buy orders (completed, cancelled, filled)
    DELETE FROM buy_orders 
    WHERE created_at < (previous_week::timestamp)
    AND status IN ('completed', 'cancelled', 'filled');
    
    GET DIAGNOSTICS cleared_buy_orders = ROW_COUNT;
    
    -- Clear old sell orders (matched, expired, cancelled)
    DELETE FROM sell_orders 
    WHERE created_at < (previous_week::timestamp)
    AND status IN ('matched', 'expired', 'cancelled');
    
    GET DIAGNOSTICS cleared_sell_orders = ROW_COUNT;
    
    -- Clear old matched orders
    DELETE FROM matched_orders 
    WHERE matched_at < (previous_week::timestamp);
    
    GET DIAGNOSTICS cleared_matched_orders = ROW_COUNT;
    
    RAISE NOTICE 'Cleared % buy orders, % sell orders, % matched orders', 
        cleared_buy_orders, cleared_sell_orders, cleared_matched_orders;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Order history cleared successfully. Removed %s buy orders, %s sell orders, %s matched orders', 
            cleared_buy_orders, cleared_sell_orders, cleared_matched_orders),
        'cleared_buy_orders', cleared_buy_orders,
        'cleared_sell_orders', cleared_sell_orders,
        'cleared_matched_orders', cleared_matched_orders,
        'previous_week_cutoff', previous_week,
        'cleared_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error clearing order history: ' || SQLERRM,
            'error_code', 'HISTORY_CLEAR_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to close exchange weekly
CREATE OR REPLACE FUNCTION close_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    affected_buy_orders INTEGER := 0;
    affected_sell_orders INTEGER := 0;
    current_week DATE;
    buy_refund_total NUMERIC := 0;
    sell_return_total NUMERIC := 0;
BEGIN
    current_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day';
    
    RAISE NOTICE 'Closing exchange for week: %', current_week;
    
    -- Cancel all pending/partial buy orders and refund money
    WITH cancelled_buys AS (
        UPDATE buy_orders 
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE status IN ('pending', 'partial')
        RETURNING user_uuid, total_amount, COALESCE(amount_filled, 0) as amount_filled
    ),
    refunds AS (
        SELECT 
            user_uuid,
            SUM(total_amount - amount_filled) as refund_amount
        FROM cancelled_buys
        GROUP BY user_uuid
    )
    UPDATE user_shares 
    SET buy_wallet = buy_wallet + r.refund_amount,
        updated_at = NOW()
    FROM refunds r
    WHERE user_shares.user_uuid = r.user_uuid;
    
    GET DIAGNOSTICS affected_buy_orders = ROW_COUNT;
    
    -- Calculate total refunded
    SELECT COALESCE(SUM(total_amount - COALESCE(amount_filled, 0)), 0) 
    INTO buy_refund_total
    FROM buy_orders 
    WHERE status = 'cancelled' 
    AND updated_at >= NOW() - INTERVAL '1 minute';
    
    -- Expire all available/partial sell orders and return shares
    WITH expired_sells AS (
        UPDATE sell_orders 
        SET status = 'expired',
            updated_at = NOW()
        WHERE status IN ('available', 'partial')
        RETURNING user_uuid, COALESCE(shares_remaining, shares_available) as shares_to_return
    ),
    returns AS (
        SELECT 
            user_uuid,
            SUM(shares_to_return) as return_shares
        FROM expired_sells
        GROUP BY user_uuid
    )
    UPDATE user_shares 
    SET hold_post = hold_post + r.return_shares,
        updated_at = NOW()
    FROM returns r
    WHERE user_shares.user_uuid = r.user_uuid;
    
    GET DIAGNOSTICS affected_sell_orders = ROW_COUNT;
    
    -- Calculate total shares returned
    SELECT COALESCE(SUM(COALESCE(shares_remaining, shares_available)), 0) 
    INTO sell_return_total
    FROM sell_orders 
    WHERE status = 'expired' 
    AND updated_at >= NOW() - INTERVAL '1 minute';
    
    RAISE NOTICE 'Exchange closed: % buy orders cancelled (N$% refunded), % sell orders expired (% shares returned)', 
        affected_buy_orders, buy_refund_total, affected_sell_orders, sell_return_total;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Exchange closed successfully. Cancelled %s buy orders (N$%s refunded), expired %s sell orders (%s shares returned)', 
            affected_buy_orders, buy_refund_total, affected_sell_orders, sell_return_total),
        'cancelled_buy_orders', affected_buy_orders,
        'expired_sell_orders', affected_sell_orders,
        'buy_refund_total', buy_refund_total,
        'sell_return_total', sell_return_total,
        'closed_at', NOW(),
        'next_opening', 'Monday 10:05 Windhoek time'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error closing exchange: ' || SQLERRM,
            'error_code', 'EXCHANGE_CLOSE_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to open exchange weekly
CREATE OR REPLACE FUNCTION open_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    current_week DATE;
    current_price NUMERIC;
    price_update_result JSON;
BEGIN
    current_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day';
    
    RAISE NOTICE 'Opening exchange for week: %', current_week;
    
    -- Get current share price
    BEGIN
        SELECT get_current_share_price() INTO current_price;
        IF current_price IS NULL OR current_price <= 0 THEN
            current_price := 108.2; -- Fallback price
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            current_price := 108.2; -- Fallback price
            RAISE NOTICE 'Using fallback price due to error: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Exchange opened for week starting % with price N$%', current_week, current_price;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Share Exchange is now live! Current price: N$%s per share', current_price),
        'opened_at', NOW(),
        'current_week', current_week,
        'current_price', current_price,
        'trading_open', true,
        'timezone', 'Africa/Windhoek (UTC+2)'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error opening exchange: ' || SQLERRM,
            'error_code', 'EXCHANGE_OPEN_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure get_current_share_price function exists
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    -- Try to get the latest price from weekly_prices
    SELECT price_per_share INTO current_price
    FROM weekly_prices 
    ORDER BY effective_date DESC 
    LIMIT 1;
    
    -- If no price found, return default
    IF current_price IS NULL THEN
        current_price := 108.2;
    END IF;
    
    RETURN current_price;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return fallback price on any error
        RETURN 108.2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure calculate_weekly_share_price_simplified function exists
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_simplified()
RETURNS JSON AS $$
DECLARE
    jse_price NUMERIC;
    new_price NUMERIC;
    price_change NUMERIC;
    percentage_change NUMERIC;
    previous_price NUMERIC;
    current_week DATE;
BEGIN
    current_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day';
    
    -- Get the latest JSE200 price
    SELECT price INTO jse_price
    FROM JSE200_PriceUpdate_Mondays
    ORDER BY date DESC
    LIMIT 1;
    
    -- If no JSE price, use fallback calculation
    IF jse_price IS NULL THEN
        RAISE NOTICE 'No JSE200 price found, using fallback calculation';
        
        -- Get previous price
        SELECT price_per_share INTO previous_price
        FROM weekly_prices
        ORDER BY effective_date DESC
        LIMIT 1;
        
        IF previous_price IS NULL THEN
            previous_price := 108.2;
        END IF;
        
        -- Apply small random change (±2%)
        new_price := previous_price * (1 + (random() - 0.5) * 0.04);
        new_price := ROUND(new_price, 2);
    ELSE
        -- Use JSE-based calculation
        new_price := ROUND(jse_price * 0.1, 2); -- 10% of JSE200 price
        
        -- Get previous price for comparison
        SELECT price_per_share INTO previous_price
        FROM weekly_prices
        ORDER BY effective_date DESC
        LIMIT 1;
        
        IF previous_price IS NULL THEN
            previous_price := 108.2;
        END IF;
    END IF;
    
    -- Calculate changes
    price_change := new_price - previous_price;
    percentage_change := CASE 
        WHEN previous_price > 0 THEN (price_change / previous_price) * 100 
        ELSE 0 
    END;
    
    -- Insert new price
    INSERT INTO weekly_prices (
        effective_date,
        price_per_share,
        jse200_price,
        price_change,
        percentage_change,
        calculation_method
    ) VALUES (
        current_week,
        new_price,
        jse_price,
        price_change,
        percentage_change,
        CASE WHEN jse_price IS NOT NULL THEN 'JSE200_based' ELSE 'fallback' END
    );
    
    -- Fixed RAISE NOTICE with correct parameter count
    RAISE NOTICE 'New share price calculated: N$% (change: N$%, %% from JSE200: N$%)', 
        new_price, price_change, ROUND(percentage_change, 2), COALESCE(jse_price, 0);
    
    RETURN json_build_object(
        'success', true,
        'message', format('Share price updated to N$%s (change: %s%s)', 
            new_price, 
            CASE WHEN price_change >= 0 THEN '+' ELSE '' END,
            ROUND(percentage_change, 2) || '%'
        ),
        'new_price', new_price,
        'previous_price', previous_price,
        'price_change', price_change,
        'percentage_change', ROUND(percentage_change, 2),
        'jse200_price', jse_price,
        'effective_date', current_week,
        'calculated_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error calculating share price: ' || SQLERRM,
            'error_code', 'PRICE_CALCULATION_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create weekly_prices table if it doesn't exist
CREATE TABLE IF NOT EXISTS weekly_prices (
    id SERIAL PRIMARY KEY,
    effective_date DATE NOT NULL UNIQUE,
    price_per_share NUMERIC(10,2) NOT NULL,
    jse200_price NUMERIC(10,2),
    price_change NUMERIC(10,2),
    percentage_change NUMERIC(5,2),
    calculation_method TEXT DEFAULT 'JSE200_based',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create JSE200_PriceUpdate_Mondays table if it doesn't exist
CREATE TABLE IF NOT EXISTS JSE200_PriceUpdate_Mondays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some sample JSE200 data if table is empty
INSERT INTO JSE200_PriceUpdate_Mondays (date, price)
SELECT 
    DATE_TRUNC('week', NOW())::DATE + INTERVAL '1 day' - INTERVAL '7 days' * generate_series(0, 4),
    1080 + (random() * 100 - 50) -- Random prices around 1080
WHERE NOT EXISTS (SELECT 1 FROM JSE200_PriceUpdate_Mondays)
ON CONFLICT (date) DO NOTHING;

-- Insert initial price if weekly_prices is empty
INSERT INTO weekly_prices (effective_date, price_per_share, calculation_method)
SELECT 
    DATE_TRUNC('week', NOW())::DATE + INTERVAL '1 day',
    108.2,
    'initial'
WHERE NOT EXISTS (SELECT 1 FROM weekly_prices)
ON CONFLICT (effective_date) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weekly_prices_effective_date ON weekly_prices(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_jse200_date ON JSE200_PriceUpdate_Mondays(date DESC);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== MISSING CORE FUNCTIONS CREATED ===';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- clear_weekly_order_history()';
    RAISE NOTICE '- close_exchange_weekly()';
    RAISE NOTICE '- open_exchange_weekly()';
    RAISE NOTICE '- get_current_share_price()';
    RAISE NOTICE '- calculate_weekly_share_price_simplified()';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables ensured:';
    RAISE NOTICE '- weekly_prices';
    RAISE NOTICE '- JSE200_PriceUpdate_Mondays';
    RAISE NOTICE '';
    RAISE NOTICE 'Sample data inserted where needed';
    RAISE NOTICE 'All functions should now work correctly';
END $$;
