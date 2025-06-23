-- Fix ambiguous column reference in auto_fill_buy_orders function
-- This addresses the PostgreSQL 42702 error

CREATE OR REPLACE FUNCTION auto_fill_buy_orders()
RETURNS JSON AS $$
DECLARE
    latest_price NUMERIC;
    processed_orders INTEGER := 0;
    buy_order RECORD;
    shares_to_buy NUMERIC;
    result JSON;
BEGIN
    -- Get current price using table alias to avoid ambiguity
    SELECT cpi.current_price INTO latest_price
    FROM current_pricing_info cpi
    ORDER BY cpi.week_start DESC
    LIMIT 1;
    
    -- Fallback if no price data found
    IF latest_price IS NULL THEN
        latest_price := 100;
    END IF;

    -- Process pending buy orders that can be auto-filled
    FOR buy_order IN 
        SELECT bo.* FROM buy_orders bo
        WHERE bo.status = 'pending' 
        AND bo.total_amount >= 50
        ORDER BY bo.created_at ASC
    LOOP
        -- Calculate shares that can be bought with available amount
        shares_to_buy := FLOOR(buy_order.total_amount / latest_price);
        
        IF shares_to_buy > 0 THEN
            -- Update buy order to completed
            UPDATE buy_orders 
            SET 
                shares_filled = shares_to_buy,
                amount_filled = shares_to_buy * latest_price,
                status = 'completed',
                price_per_share = latest_price
            WHERE id = buy_order.id;

            -- Add shares to buyer's pre-hold wallet
            INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
            VALUES (buy_order.user_uuid, 'hold_pre', shares_to_buy, 'auto_fill_purchase')
            ON CONFLICT (user_uuid, wallet_type)
            DO UPDATE SET shares = user_shares.shares + EXCLUDED.shares;

            -- Log transaction
            INSERT INTO share_transactions (
                user_uuid, transaction_type, shares, price_per_share, total_amount,
                to_wallet, status, description, reference_id
            ) VALUES (
                buy_order.user_uuid, 'buy', shares_to_buy, latest_price, 
                shares_to_buy * latest_price, 'hold_pre', 'completed', 
                'Auto-filled buy order', 'AUTO-' || buy_order.id
            );

            processed_orders := processed_orders + 1;
        END IF;
    END LOOP;

    result := json_build_object(
        'success', true,
        'message', format('Auto-filled %s buy orders at price N$%s', processed_orders, latest_price),
        'orders_processed', processed_orders,
        'price_used', latest_price
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error in auto_fill_buy_orders: ' || SQLERRM,
            'error_code', 'AUTO_FILL_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix get_current_share_price function to use table alias
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
    latest_price NUMERIC;
BEGIN
    -- Get current price using table alias to avoid ambiguity
    SELECT cpi.current_price INTO latest_price
    FROM current_pricing_info cpi
    ORDER BY cpi.week_start DESC
    LIMIT 1;
    
    -- Return fallback price if no data found
    RETURN COALESCE(latest_price, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
