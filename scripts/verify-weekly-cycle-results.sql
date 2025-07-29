-- Verify weekly cycle results with comprehensive output for Supabase UI
-- This script creates a function that returns complete system status after simulation

CREATE OR REPLACE FUNCTION run_weekly_cycle_verification()
RETURNS JSON AS $$
DECLARE
    result JSON;
    exchange_open BOOLEAN;
    current_price NUMERIC;
    price_history JSON;
    order_summary JSON;
    system_status JSON;
    verification_time TIMESTAMPTZ;
BEGIN
    verification_time := NOW();
    RAISE NOTICE 'Starting weekly cycle verification at: %', verification_time;
    
    -- Check exchange status
    SELECT is_open INTO exchange_open 
    FROM exchange_trading_hours 
    WHERE id = 1;
    
    RAISE NOTICE 'Exchange is currently: %', 
        CASE WHEN exchange_open THEN 'OPEN' ELSE 'CLOSED' END;
    
    -- Get current price
    SELECT price INTO current_price 
    FROM weekly_share_price 
    ORDER BY week DESC 
    LIMIT 1;
    
    RAISE NOTICE 'Current share price: %', COALESCE(current_price, 0);
    
    -- Get price history (last 5 weeks)
    SELECT json_agg(
        json_build_object(
            'week', week,
            'price', price,
            'jse200_change', jse200_change,
            'created_at', created_at
        ) ORDER BY week DESC
    ) INTO price_history
    FROM (
        SELECT week, price, jse200_change, created_at
        FROM weekly_share_price 
        ORDER BY week DESC 
        LIMIT 5
    ) recent_prices;
    
    -- Get order summary
    SELECT json_build_object(
        'active_buy_orders', (
            SELECT COUNT(*) FROM buy_orders 
            WHERE status IN ('pending', 'partially_filled')
        ),
        'active_sell_orders', (
            SELECT COUNT(*) FROM sell_orders 
            WHERE status IN ('pending', 'partially_filled')
        ),
        'completed_buy_orders', (
            SELECT COUNT(*) FROM buy_orders 
            WHERE status = 'filled'
        ),
        'completed_sell_orders', (
            SELECT COUNT(*) FROM sell_orders 
            WHERE status = 'filled'
        ),
        'expired_orders', (
            SELECT COUNT(*) FROM buy_orders WHERE status = 'expired'
        ) + (
            SELECT COUNT(*) FROM sell_orders WHERE status = 'expired'
        )
    ) INTO order_summary;
    
    -- Get system status
    SELECT json_build_object(
        'total_users', (SELECT COUNT(DISTINCT user_uuid) FROM user_shares),
        'total_shares_in_circulation', (
            SELECT COALESCE(SUM(shares), 0) FROM user_shares 
            WHERE wallet_type IN ('trading_wallet', 'hold_wallet_post_hold')
        ),
        'total_vesting_shares', (
            SELECT COALESCE(SUM(amount), 0) FROM pivot_vesting 
            WHERE status IN ('locked', 'vest')
        ),
        'recent_transactions', (
            SELECT COUNT(*) FROM share_transactions 
            WHERE created_at > NOW() - INTERVAL '24 hours'
        )
    ) INTO system_status;
    
    -- Log verification results
    RAISE NOTICE 'Verification completed:';
    RAISE NOTICE '- Exchange Open: %', exchange_open;
    RAISE NOTICE '- Current Price: %', current_price;
    RAISE NOTICE '- Active Buy Orders: %', (order_summary->>'active_buy_orders')::INTEGER;
    RAISE NOTICE '- Active Sell Orders: %', (order_summary->>'active_sell_orders')::INTEGER;
    RAISE NOTICE '- Total Users: %', (system_status->>'total_users')::INTEGER;
    
    -- Build comprehensive result
    SELECT json_build_object(
        'success', true,
        'message', 'Weekly cycle verification completed',
        'verification_time', verification_time,
        'data', json_build_object(
            'exchange_status', json_build_object(
                'is_open', exchange_open,
                'status_text', CASE WHEN exchange_open THEN 'OPEN' ELSE 'CLOSED' END
            ),
            'pricing', json_build_object(
                'current_price', current_price,
                'price_history', price_history
            ),
            'orders', order_summary,
            'system', system_status,
            'verification_summary', json_build_object(
                'exchange_operational', exchange_open IS NOT NULL,
                'pricing_updated', current_price IS NOT NULL,
                'orders_active', (order_summary->>'active_buy_orders')::INTEGER + (order_summary->>'active_sell_orders')::INTEGER > 0,
                'system_healthy', (system_status->>'total_users')::INTEGER > 0
            )
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error in weekly cycle verification: ' || SQLERRM,
            'verification_time', verification_time
        );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION run_weekly_cycle_verification() TO authenticated;

-- Test the function
SELECT run_weekly_cycle_verification();
