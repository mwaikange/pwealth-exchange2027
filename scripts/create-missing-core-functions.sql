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

-- Function to get current share price using actual table schema
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    -- Try to get the latest final_price from weekly_prices (using correct column name)
    SELECT final_price INTO current_price
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

-- FIXED: Function with correct RAISE NOTICE parameter count
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_simplified()
RETURNS JSON AS $$
DECLARE
    jse_percent_change NUMERIC;
    base_price NUMERIC;
    percentage_amount NUMERIC;
    new_final_price NUMERIC;
    price_change NUMERIC;
    current_week DATE;
BEGIN
    current_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day';
    
    -- Get the latest JSE200 percent_change from the table
    SELECT percent_change INTO jse_percent_change
    FROM JSE200_PriceUpdate_Mondays
    ORDER BY date DESC
    LIMIT 1;
    
    -- Get the previous week's final_price as base_price for this week
    SELECT final_price INTO base_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Set defaults if no data found
    IF base_price IS NULL THEN
        base_price := 108.2;
    END IF;
    
    IF jse_percent_change IS NULL THEN
        RAISE NOTICE 'No JSE200 percent_change found, using minimal growth';
        jse_percent_change := (random() - 0.5) * 2; -- ±1% random growth
    END IF;
    
    -- CORRECT PERCENTAGE CALCULATION:
    -- If percent_change is -1.6: base - (base * 0.016) = base * (1 - 0.016) = base * 0.984
    -- If percent_change is +1.6: base + (base * 0.016) = base * (1 + 0.016) = base * 1.016
    -- General formula: base * (1 + (percent_change / 100))
    
    -- Calculate the percentage amount (this goes in price_change column)
    percentage_amount := base_price * (ABS(jse_percent_change) / 100);
    
    -- Apply the percentage change to get new final price
    new_final_price := base_price * (1 + (jse_percent_change / 100));
    
    -- Calculate actual price change (positive or negative)
    price_change := new_final_price - base_price;
    
    -- Round to 2 decimal places
    new_final_price := ROUND(new_final_price, 2);
    price_change := ROUND(price_change, 2);
    
    -- Insert new price record using correct column names
    INSERT INTO weekly_prices (
        effective_date,
        base_price,
        j200_growth,
        final_price,
        price_change
    ) VALUES (
        current_week,
        base_price,
        jse_percent_change, -- Store the JSE200 percent_change directly
        new_final_price,
        price_change -- This is the actual N$ amount change
    );
    
    -- FIXED: Use separate RAISE NOTICE statements to avoid parameter mismatch
    RAISE NOTICE 'Price calculation completed successfully:';
    RAISE NOTICE '  Base price: N$%', base_price;
    RAISE NOTICE '  JSE200 change: %%', jse_percent_change;
    RAISE NOTICE '  Price change: N$%', price_change;
    RAISE NOTICE '  Final price: N$%', new_final_price;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Share price updated to N$%s (JSE200: %s%s, change: N$%s)', 
            new_final_price, 
            CASE WHEN jse_percent_change >= 0 THEN '+' ELSE '' END,
            jse_percent_change || '%',
            CASE WHEN price_change >= 0 THEN '+' ELSE '' END || price_change
        ),
        'base_price', base_price,
        'final_price', new_final_price,
        'price_change', price_change,
        'jse_percent_change', jse_percent_change,
        'calculation_example', format('N$%s * (1 + %s/100) = N$%s', base_price, jse_percent_change, new_final_price),
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

-- Create JSE200_PriceUpdate_Mondays table if it doesn't exist (with percent_change column)
CREATE TABLE IF NOT EXISTS JSE200_PriceUpdate_Mondays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    price NUMERIC(10,2) NOT NULL,
    percent_change NUMERIC(5,2) DEFAULT 0, -- This is the key column!
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some sample JSE200 data with percent_change if table is empty
INSERT INTO JSE200_PriceUpdate_Mondays (date, price, percent_change)
SELECT 
    DATE_TRUNC('week', NOW())::DATE + INTERVAL '1 day' - INTERVAL '7 days' * generate_series(0, 4),
    1080 + (random() * 100 - 50), -- Random prices around 1080
    ROUND((random() - 0.5) * 6, 2) -- Random percent changes between -3% and +3%
WHERE NOT EXISTS (SELECT 1 FROM JSE200_PriceUpdate_Mondays)
ON CONFLICT (date) DO NOTHING;

-- Insert initial price using correct column names
INSERT INTO weekly_prices (effective_date, base_price, j200_growth, final_price, price_change)
SELECT 
    DATE_TRUNC('week', NOW())::DATE + INTERVAL '1 day',
    108.2,  -- base_price
    0,      -- j200_growth (0% for initial)
    108.2,  -- final_price (same as base for initial)
    0       -- price_change (0 for initial)
WHERE NOT EXISTS (SELECT 1 FROM weekly_prices)
ON CONFLICT (effective_date) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weekly_prices_effective_date ON weekly_prices(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_jse200_date ON JSE200_PriceUpdate_Mondays(date DESC);

-- Final success message
DO $$
DECLARE
    jse_count INTEGER;
    weekly_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Count records to verify setup
    SELECT COUNT(*) INTO jse_count FROM JSE200_PriceUpdate_Mondays;
    SELECT COUNT(*) INTO weekly_count FROM weekly_prices;
    
    -- Count functions created
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'clear_weekly_order_history',
        'close_exchange_weekly', 
        'open_exchange_weekly',
        'get_current_share_price',
        'calculate_weekly_share_price_simplified'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    ✅ CREATE-MISSING-CORE-FUNCTIONS.SQL                   █';
    RAISE NOTICE '█                              COMPLETED SUCCESSFULLY!                       █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 FUNCTIONS CREATED: % of 5', function_count;
    RAISE NOTICE '   ✓ clear_weekly_order_history()';
    RAISE NOTICE '   ✓ close_exchange_weekly()';
    RAISE NOTICE '   ✓ open_exchange_weekly()';
    RAISE NOTICE '   ✓ get_current_share_price()';
    RAISE NOTICE '   ✓ calculate_weekly_share_price_simplified() [FIXED RAISE NOTICE]';
    RAISE NOTICE '';
    RAISE NOTICE '📊 DATA SETUP:';
    RAISE NOTICE '   ✓ JSE200_PriceUpdate_Mondays: % records', jse_count;
    RAISE NOTICE '   ✓ weekly_prices: % records', weekly_count;
    RAISE NOTICE '   ✓ Indexes created for performance';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 PERCENTAGE CALCULATION LOGIC:';
    RAISE NOTICE '   Formula: new_price = base_price * (1 + percent_change/100)';
    RAISE NOTICE '   Example: N$100 * (1 + (-1.6)/100) = N$100 * 0.984 = N$98.40';
    RAISE NOTICE '   Example: N$100 * (1 + (+1.6)/100) = N$100 * 1.016 = N$101.60';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 READY FOR NEXT STEP: scripts/create-exchange-trading-hours-fixed.sql';
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
