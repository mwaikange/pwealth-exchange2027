-- STEP 2: Create all the other functions (exchange management functions)

-- Function to get current share price
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    SELECT final_price INTO current_price
    FROM weekly_prices 
    ORDER BY effective_date DESC 
    LIMIT 1;
    
    IF current_price IS NULL THEN
        current_price := 108.2;
    END IF;
    
    RETURN current_price;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 108.2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear weekly order history
CREATE OR REPLACE FUNCTION clear_weekly_order_history()
RETURNS JSON AS $$
DECLARE
    previous_week DATE;
    cleared_buy_orders INTEGER := 0;
    cleared_sell_orders INTEGER := 0;
    cleared_matched_orders INTEGER := 0;
BEGIN
    previous_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day' - INTERVAL '7 days';
    
    DELETE FROM buy_orders 
    WHERE created_at < (previous_week::timestamp)
    AND status IN ('completed', 'cancelled', 'filled');
    
    GET DIAGNOSTICS cleared_buy_orders = ROW_COUNT;
    
    DELETE FROM sell_orders 
    WHERE created_at < (previous_week::timestamp)
    AND status IN ('matched', 'expired', 'cancelled');
    
    GET DIAGNOSTICS cleared_sell_orders = ROW_COUNT;
    
    DELETE FROM matched_orders 
    WHERE matched_at < (previous_week::timestamp);
    
    GET DIAGNOSTICS cleared_matched_orders = ROW_COUNT;
    
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
BEGIN
    current_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day';
    
    -- Get current share price
    BEGIN
        SELECT get_current_share_price() INTO current_price;
        IF current_price IS NULL OR current_price <= 0 THEN
            current_price := 108.2;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            current_price := 108.2;
    END;
    
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weekly_prices_effective_date ON weekly_prices(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_jse200_date ON JSE200_PriceUpdate_Mondays(date DESC);

-- Success message for step 2
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'clear_weekly_order_history',
        'close_exchange_weekly', 
        'open_exchange_weekly',
        'get_current_share_price'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                      █';
    RAISE NOTICE '█                    ✅ STEP 2 COMPLETED SUCCESSFULLY!                █';
    RAISE NOTICE '█                   Exchange Management Functions                     █';
    RAISE NOTICE '█                                                                      █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '✓ get_current_share_price() function created';
    RAISE NOTICE '✓ clear_weekly_order_history() function created';
    RAISE NOTICE '✓ close_exchange_weekly() function created';
    RAISE NOTICE '✓ open_exchange_weekly() function created';
    RAISE NOTICE '✓ Performance indexes created';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Functions created: %', function_count;
    RAISE NOTICE '';
    RAISE NOTICE '🚀 READY FOR STEP 3: Run 03-create-exchange-trading-hours.sql';
    RAISE NOTICE '';
END $$;
