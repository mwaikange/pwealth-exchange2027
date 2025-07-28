-- Create exchange status management system (FIXED VERSION)
-- Run this to implement proper trading hours and weekly clearing

-- 1. Create exchange_status table to track trading state
CREATE TABLE IF NOT EXISTS exchange_status (
    id SERIAL PRIMARY KEY,
    is_trading_open BOOLEAN DEFAULT false,
    current_week_start DATE,
    last_price_update TIMESTAMPTZ,
    status_message TEXT DEFAULT 'Exchange is closed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial status
INSERT INTO exchange_status (is_trading_open, status_message, current_week_start)
VALUES (false, 'Exchange is closed - waiting for Monday price calculation', DATE_TRUNC('week', NOW())::DATE)
ON CONFLICT DO NOTHING;

-- 2. Function to close exchange and clear all orders (Sunday 23:59)
CREATE OR REPLACE FUNCTION close_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    expired_sell_count INTEGER := 0;
    cancelled_buy_count INTEGER := 0;
    sell_order RECORD;
    buy_order RECORD;
    result JSON;
BEGIN
    -- Close trading
    UPDATE exchange_status 
    SET 
        is_trading_open = false,
        status_message = 'Exchange is closed - weekly clearing in progress',
        updated_at = NOW();

    -- Process expired sell orders (return shares to users)
    FOR sell_order IN 
        SELECT * FROM sell_orders 
        WHERE status IN ('available', 'partial')
        AND expires_at <= NOW()
    LOOP
        -- Return unsold shares to user's post-hold wallet
        UPDATE user_shares 
        SET shares = shares + sell_order.shares_remaining,
            updated_at = NOW()
        WHERE user_uuid = sell_order.user_uuid AND wallet_type = 'hold_post';

        -- Mark order as expired
        UPDATE sell_orders 
        SET status = 'expired', updated_at = NOW()
        WHERE id = sell_order.id;

        -- Log transaction
        INSERT INTO share_transactions (
            user_uuid, transaction_type, shares, price_per_share, total_amount,
            to_wallet, status, description, reference_id
        ) VALUES (
            sell_order.user_uuid, 'sell', sell_order.shares_remaining, 
            sell_order.price_per_share, sell_order.shares_remaining * sell_order.price_per_share,
            'hold_post', 'expired', 'Weekly exchange close - sell order expired, shares returned', 
            'WEEKLY-EXP-' || sell_order.id
        );

        expired_sell_count := expired_sell_count + 1;
    END LOOP;

    -- Cancel all pending/partial buy orders (refund money to users)
    FOR buy_order IN 
        SELECT * FROM buy_orders 
        WHERE status IN ('pending', 'partial')
    LOOP
        -- Calculate remaining amount to refund
        DECLARE
            remaining_amount NUMERIC := buy_order.total_amount - COALESCE(buy_order.amount_filled, 0);
        BEGIN
            -- Refund remaining amount to buy wallet
            UPDATE user_shares 
            SET shares = shares + remaining_amount,
                updated_at = NOW()
            WHERE user_uuid = buy_order.user_uuid AND wallet_type = 'buy_wallet';

            -- Mark order as cancelled
            UPDATE buy_orders 
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = buy_order.id;

            -- Log transaction
            INSERT INTO share_transactions (
                user_uuid, transaction_type, shares, price_per_share, total_amount,
                to_wallet, status, description, reference_id
            ) VALUES (
                buy_order.user_uuid, 'buy', 0, buy_order.price_per_share, remaining_amount,
                'buy_wallet', 'cancelled', 'Weekly exchange close - buy order cancelled, funds refunded', 
                'WEEKLY-CANCEL-' || buy_order.id
            );

            cancelled_buy_count := cancelled_buy_count + 1;
        END;
    END LOOP;

    -- Update status
    UPDATE exchange_status 
    SET 
        status_message = 'Exchange closed - waiting for Monday price calculation',
        updated_at = NOW();

    result := json_build_object(
        'success', true,
        'message', format('Exchange closed. Expired %s sell orders, cancelled %s buy orders', 
            expired_sell_count, cancelled_buy_count),
        'expired_sell_orders', expired_sell_count,
        'cancelled_buy_orders', cancelled_buy_count,
        'closed_at', NOW()
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error closing exchange: ' || SQLERRM,
            'error_code', 'EXCHANGE_CLOSE_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to open exchange after price calculation (Monday 09:25)
CREATE OR REPLACE FUNCTION open_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    current_price NUMERIC;
    week_start DATE;
    result JSON;
BEGIN
    -- Get current share price
    current_price := get_current_share_price();
    week_start := DATE_TRUNC('week', NOW())::DATE;

    -- Open trading
    UPDATE exchange_status 
    SET 
        is_trading_open = true,
        current_week_start = week_start,
        last_price_update = NOW(),
        status_message = format('Share Exchange is now live! Current price: N$%s per share', current_price),
        updated_at = NOW();

    result := json_build_object(
        'success', true,
        'message', format('Exchange opened for week of %s. Current price: N$%s', week_start, current_price),
        'current_price', current_price,
        'week_start', week_start,
        'opened_at', NOW()
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error opening exchange: ' || SQLERRM,
            'error_code', 'EXCHANGE_OPEN_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to clear user order history weekly (Monday 09:23)
CREATE OR REPLACE FUNCTION clear_weekly_order_history()
RETURNS JSON AS $$
DECLARE
    deleted_buy_count INTEGER := 0;
    deleted_sell_count INTEGER := 0;
    result JSON;
BEGIN
    -- Archive old orders to history table (optional)
    -- You could create order_history tables here if needed

    -- Delete completed/expired/cancelled orders from previous weeks
    WITH deleted_buy AS (
        DELETE FROM buy_orders 
        WHERE status IN ('completed', 'filled', 'cancelled')
        AND created_at < DATE_TRUNC('week', NOW())
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_buy_count FROM deleted_buy;

    WITH deleted_sell AS (
        DELETE FROM sell_orders 
        WHERE status IN ('matched', 'completed', 'expired', 'cancelled')
        AND created_at < DATE_TRUNC('week', NOW())
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_sell_count FROM deleted_sell;

    -- Also clean up old matched_orders
    DELETE FROM matched_orders 
    WHERE matched_at < DATE_TRUNC('week', NOW());

    result := json_build_object(
        'success', true,
        'message', format('Cleared %s buy orders and %s sell orders from previous weeks', 
            deleted_buy_count, deleted_sell_count),
        'deleted_buy_orders', deleted_buy_count,
        'deleted_sell_orders', deleted_sell_count,
        'cleared_at', NOW()
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error clearing order history: ' || SQLERRM,
            'error_code', 'HISTORY_CLEAR_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to check if exchange is open
CREATE OR REPLACE FUNCTION is_exchange_open()
RETURNS BOOLEAN AS $$
DECLARE
    is_open BOOLEAN := false;
BEGIN
    SELECT is_trading_open INTO is_open 
    FROM exchange_status 
    ORDER BY updated_at DESC 
    LIMIT 1;
    
    RETURN COALESCE(is_open, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get exchange status
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    status_record RECORD;
    current_price NUMERIC;
BEGIN
    SELECT * INTO status_record 
    FROM exchange_status 
    ORDER BY updated_at DESC 
    LIMIT 1;

    current_price := get_current_share_price();

    RETURN json_build_object(
        'is_trading_open', COALESCE(status_record.is_trading_open, false),
        'status_message', COALESCE(status_record.status_message, 'Exchange status unknown'),
        'current_price', current_price,
        'current_week_start', status_record.current_week_start,
        'last_price_update', status_record.last_price_update,
        'last_updated', status_record.updated_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple indexes for performance (without DATE_TRUNC)
CREATE INDEX IF NOT EXISTS idx_exchange_status_updated_at ON exchange_status(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_buy_orders_status ON buy_orders(status);
CREATE INDEX IF NOT EXISTS idx_sell_orders_status ON sell_orders(status);
CREATE INDEX IF NOT EXISTS idx_buy_orders_created_at ON buy_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_sell_orders_created_at ON sell_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_matched_orders_matched_at ON matched_orders(matched_at);

-- Add a computed column for week if needed for better performance
ALTER TABLE buy_orders ADD COLUMN IF NOT EXISTS week_start DATE GENERATED ALWAYS AS (DATE_TRUNC('week', created_at)::DATE) STORED;
ALTER TABLE sell_orders ADD COLUMN IF NOT EXISTS week_start DATE GENERATED ALWAYS AS (DATE_TRUNC('week', created_at)::DATE) STORED;

-- Now we can create indexes on the computed columns
CREATE INDEX IF NOT EXISTS idx_buy_orders_week_status ON buy_orders(week_start, status);
CREATE INDEX IF NOT EXISTS idx_sell_orders_week_status ON sell_orders(week_start, status);
