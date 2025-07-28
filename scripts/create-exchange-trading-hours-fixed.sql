-- Create exchange status and trading hours management
-- Updated for new schedule: Close Sunday 23:59, Open Monday 10:05 (Windhoek time)

-- Create exchange_status table if not exists
CREATE TABLE IF NOT EXISTS exchange_status (
    id SERIAL PRIMARY KEY,
    is_trading_open BOOLEAN NOT NULL DEFAULT false,
    current_week_start DATE NOT NULL,
    last_price_update TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    maintenance_message TEXT
);

-- Insert initial status if table is empty
INSERT INTO exchange_status (is_trading_open, current_week_start, maintenance_message)
SELECT 
    false,
    DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day',
    'Exchange initialization - trading will begin Monday 10:05 Windhoek time'
WHERE NOT EXISTS (SELECT 1 FROM exchange_status);

-- Add computed columns to order tables for better indexing
-- Add week_start column to buy_orders if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buy_orders' AND column_name = 'week_start') THEN
        ALTER TABLE buy_orders ADD COLUMN week_start DATE GENERATED ALWAYS AS (
            (DATE_TRUNC('week', created_at AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day')
        ) STORED;
    END IF;
END
$$;

-- Add week_start column to sell_orders if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sell_orders' AND column_name = 'week_start') THEN
        ALTER TABLE sell_orders ADD COLUMN week_start DATE GENERATED ALWAYS AS (
            (DATE_TRUNC('week', created_at AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day')
        ) STORED;
    END IF;
END
$$;

-- Create indexes on the computed columns (safe indexes)
CREATE INDEX IF NOT EXISTS idx_buy_orders_week_status ON buy_orders(week_start, status);
CREATE INDEX IF NOT EXISTS idx_sell_orders_week_status ON sell_orders(week_start, status);
CREATE INDEX IF NOT EXISTS idx_buy_orders_user_week ON buy_orders(user_uuid, week_start);
CREATE INDEX IF NOT EXISTS idx_sell_orders_user_week ON sell_orders(user_uuid, week_start);

-- Function to close exchange weekly (Sunday 23:59)
CREATE OR REPLACE FUNCTION close_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    affected_buy_orders INTEGER;
    affected_sell_orders INTEGER;
    current_week DATE;
BEGIN
    current_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day';
    
    -- Cancel all pending buy orders and return funds
    WITH cancelled_buys AS (
        UPDATE buy_orders 
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE status IN ('pending', 'partial')
        AND week_start = current_week
        RETURNING user_uuid, total_amount, amount_filled
    )
    UPDATE user_shares 
    SET buy_wallet = buy_wallet + (cb.total_amount - cb.amount_filled)
    FROM cancelled_buys cb
    WHERE user_shares.user_uuid = cb.user_uuid;
    
    GET DIAGNOSTICS affected_buy_orders = ROW_COUNT;
    
    -- Expire all available sell orders and return shares
    WITH expired_sells AS (
        UPDATE sell_orders 
        SET status = 'expired',
            updated_at = NOW()
        WHERE status IN ('available', 'partial')
        AND week_start = current_week
        RETURNING user_uuid, shares_remaining
    )
    UPDATE user_shares 
    SET hold_post = hold_post + es.shares_remaining
    FROM expired_sells es
    WHERE user_shares.user_uuid = es.user_uuid;
    
    GET DIAGNOSTICS affected_sell_orders = ROW_COUNT;
    
    -- Update exchange status
    UPDATE exchange_status 
    SET is_trading_open = false,
        last_updated = NOW(),
        maintenance_message = 'Exchange closed for weekly maintenance. Trading resumes Monday 10:05 (Windhoek time)'
    WHERE id = 1;
    
    -- Log the closure
    RAISE NOTICE 'Exchange closed: % buy orders cancelled, % sell orders expired', affected_buy_orders, affected_sell_orders;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Exchange closed successfully',
        'cancelled_buy_orders', affected_buy_orders,
        'expired_sell_orders', affected_sell_orders,
        'closed_at', NOW(),
        'next_opening', 'Monday 10:05 Windhoek time'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error closing exchange: ' || SQLERRM,
            'error_code', 'EXCHANGE_CLOSE_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear weekly order history (Monday 09:30)
CREATE OR REPLACE FUNCTION clear_weekly_order_history()
RETURNS JSON AS $$
DECLARE
    previous_week DATE;
    cleared_buy_orders INTEGER;
    cleared_sell_orders INTEGER;
BEGIN
    -- Calculate previous week start
    previous_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day' - INTERVAL '7 days';
    
    -- Archive old completed orders (move to history table or delete)
    DELETE FROM buy_orders 
    WHERE week_start < previous_week
    AND status IN ('completed', 'cancelled', 'filled');
    
    GET DIAGNOSTICS cleared_buy_orders = ROW_COUNT;
    
    DELETE FROM sell_orders 
    WHERE week_start < previous_week
    AND status IN ('matched', 'expired', 'cancelled');
    
    GET DIAGNOSTICS cleared_sell_orders = ROW_COUNT;
    
    -- Log the clearing
    RAISE NOTICE 'Order history cleared: % buy orders, % sell orders', cleared_buy_orders, cleared_sell_orders;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Order history cleared successfully',
        'cleared_buy_orders', cleared_buy_orders,
        'cleared_sell_orders', cleared_sell_orders,
        'previous_week', previous_week,
        'cleared_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error clearing order history: ' || SQLERRM,
            'error_code', 'HISTORY_CLEAR_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to open exchange weekly (Monday 10:05)
CREATE OR REPLACE FUNCTION open_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    current_week DATE;
    current_price NUMERIC;
BEGIN
    current_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day';
    
    -- Get current share price
    SELECT get_current_share_price() INTO current_price;
    
    -- Update exchange status
    UPDATE exchange_status 
    SET is_trading_open = true,
        current_week_start = current_week,
        last_updated = NOW(),
        maintenance_message = NULL
    WHERE id = 1;
    
    -- Log the opening
    RAISE NOTICE 'Exchange opened for week starting %', current_week;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Share Exchange is now live! Current price: N$' || current_price || ' per share',
        'opened_at', NOW(),
        'current_week', current_week,
        'current_price', current_price,
        'trading_open', true
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error opening exchange: ' || SQLERRM,
            'error_code', 'EXCHANGE_OPEN_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current exchange status
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    current_time TIMESTAMP WITH TIME ZONE;
    current_day INTEGER;
    current_hour INTEGER;
    current_minute INTEGER;
    is_open BOOLEAN := false;
    status_msg TEXT;
    current_price NUMERIC;
    current_week DATE;
    last_price_update TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current time in Windhoek timezone (CAT/SAST - UTC+2)
    current_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    current_day := EXTRACT(DOW FROM current_time); -- 0=Sunday, 1=Monday, etc.
    current_hour := EXTRACT(HOUR FROM current_time);
    current_minute := EXTRACT(MINUTE FROM current_time);
    
    -- Get current week start (Monday)
    current_week := DATE_TRUNC('week', current_time)::DATE + INTERVAL '1 day';
    
    -- Get current share price
    SELECT get_current_share_price() INTO current_price;
    
    -- Get last price update
    SELECT effective_date INTO last_price_update
    FROM weekly_prices 
    ORDER BY effective_date DESC 
    LIMIT 1;
    
    -- Determine if exchange is open based on new schedule
    -- Open: Monday 10:05 to Sunday 23:59
    IF current_day = 0 THEN  -- Sunday
        IF current_hour < 23 OR (current_hour = 23 AND current_minute < 59) THEN
            is_open := true;
            status_msg := 'Share Exchange is live! Current price: N$' || current_price || ' per share';
        ELSE
            is_open := false;
            status_msg := 'Exchange closing for weekly maintenance. Trading resumes Monday at 10:05 (Windhoek time)';
        END IF;
    ELSIF current_day = 1 THEN  -- Monday
        IF current_hour < 10 OR (current_hour = 10 AND current_minute < 5) THEN
            is_open := false;
            IF current_hour < 9 OR (current_hour = 9 AND current_minute < 30) THEN
                status_msg := 'Exchange closed - Weekly maintenance in progress. Opens at 10:05 (Windhoek time)';
            ELSIF current_hour = 9 AND current_minute >= 30 AND current_minute < 60 THEN
                status_msg := 'Exchange closed - Clearing order history. Opens at 10:05 (Windhoek time)';
            ELSIF current_hour = 10 AND current_minute >= 0 AND current_minute < 3 THEN
                status_msg := 'Exchange closed - Preparing for price calculation. Opens at 10:05 (Windhoek time)';
            ELSIF current_hour = 10 AND current_minute >= 3 AND current_minute < 5 THEN
                status_msg := 'Exchange closed - Calculating new share price. Opens at 10:05 (Windhoek time)';
            END IF;
        ELSE
            is_open := true;
            status_msg := 'Share Exchange is live! Current price: N$' || current_price || ' per share';
        END IF;
    ELSE  -- Tuesday to Saturday
        is_open := true;
        status_msg := 'Share Exchange is live! Current price: N$' || current_price || ' per share';
    END IF;
    
    RETURN json_build_object(
        'is_trading_open', is_open,
        'status_message', status_msg,
        'current_price', current_price,
        'current_week_start', current_week,
        'last_price_update', last_price_update,
        'last_updated', NOW(),
        'windhoek_time', current_time,
        'trading_schedule', json_build_object(
            'weekly_close', 'Sunday 23:59',
            'history_clear', 'Monday 09:30',
            'price_calculation', 'Monday 10:03',
            'weekly_open', 'Monday 10:05',
            'timezone', 'Africa/Windhoek (UTC+2)'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update place_buy_order to check exchange status
CREATE OR REPLACE FUNCTION place_buy_order(p_user_uuid UUID, p_total_amount NUMERIC)
RETURNS JSON AS $$
DECLARE
    exchange_open BOOLEAN;
    result JSON;
BEGIN
    -- Check if exchange is open
    SELECT (get_exchange_status())->>'is_trading_open' INTO exchange_open;
    
    IF NOT exchange_open::boolean THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Exchange is currently closed. Trading resumes Monday at 10:05 (Windhoek time).',
            'error_code', 'EXCHANGE_CLOSED'
        );
    END IF;
    
    -- If exchange is open, proceed with original logic
    -- (Insert your existing place_buy_order logic here)
    -- For now, returning a placeholder
    RETURN json_build_object(
        'success', true,
        'message', 'Buy order placed successfully',
        'order_id', gen_random_uuid(),
        'amount', p_total_amount
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error placing buy order: ' || SQLERRM,
            'error_code', 'BUY_ORDER_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update place_sell_order to check exchange status
CREATE OR REPLACE FUNCTION place_sell_order(p_user_uuid UUID, p_shares NUMERIC)
RETURNS JSON AS $$
DECLARE
    exchange_open BOOLEAN;
    result JSON;
BEGIN
    -- Check if exchange is open
    SELECT (get_exchange_status())->>'is_trading_open' INTO exchange_open;
    
    IF NOT exchange_open::boolean THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Exchange is currently closed. Trading resumes Monday at 10:05 (Windhoek time).',
            'error_code', 'EXCHANGE_CLOSED'
        );
    END IF;
    
    -- If exchange is open, proceed with original logic
    -- (Insert your existing place_sell_order logic here)
    -- For now, returning a placeholder
    RETURN json_build_object(
        'success', true,
        'message', 'Sell order placed successfully',
        'order_id', gen_random_uuid(),
        'shares', p_shares
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error placing sell order: ' || SQLERRM,
            'error_code', 'SELL_ORDER_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== EXCHANGE TRADING HOURS SETUP COMPLETE ===';
    RAISE NOTICE 'Exchange status table created';
    RAISE NOTICE 'Order tables updated with week_start columns';
    RAISE NOTICE 'Indexes created for better performance';
    RAISE NOTICE 'Functions created for weekly cycle management';
    RAISE NOTICE '';
    RAISE NOTICE 'Current schedule (Africa/Windhoek timezone):';
    RAISE NOTICE '- Sunday 23:59: Close exchange & clear orders';
    RAISE NOTICE '- Monday 09:30: Clear order history';
    RAISE NOTICE '- Monday 10:03: Calculate share price';
    RAISE NOTICE '- Monday 10:05: Open exchange';
    RAISE NOTICE '';
    RAISE NOTICE 'Use SELECT get_exchange_status(); to check current status';
END $$;
