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

-- Ensure user_shares table exists with required columns
CREATE TABLE IF NOT EXISTS user_shares (
    user_uuid UUID PRIMARY KEY,
    buy_wallet NUMERIC(15,2) DEFAULT 0,
    hold_pre NUMERIC(15,4) DEFAULT 0,
    hold_post NUMERIC(15,4) DEFAULT 0,
    cashout_wallet NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure buy_orders table exists
CREATE TABLE IF NOT EXISTS buy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    price_per_share NUMERIC(10,2) NOT NULL,
    amount_filled NUMERIC(15,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure sell_orders table exists
CREATE TABLE IF NOT EXISTS sell_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL,
    shares_available NUMERIC(15,4) NOT NULL,
    shares_remaining NUMERIC(15,4) NOT NULL,
    price_per_share NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure matched_orders table exists
CREATE TABLE IF NOT EXISTS matched_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buy_order_id UUID NOT NULL,
    sell_order_id UUID NOT NULL,
    buyer_uuid UUID NOT NULL,
    seller_uuid UUID NOT NULL,
    shares_matched NUMERIC(15,4) NOT NULL,
    price_per_share NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_buy_orders_status ON buy_orders(status);
CREATE INDEX IF NOT EXISTS idx_sell_orders_status ON sell_orders(status);
CREATE INDEX IF NOT EXISTS idx_user_shares_user_uuid ON user_shares(user_uuid);

-- Function to check if exchange is open
CREATE OR REPLACE FUNCTION is_exchange_open()
RETURNS BOOLEAN AS $$
DECLARE
    current_time TIMESTAMP WITH TIME ZONE;
    current_day INTEGER;
    current_hour INTEGER;
    current_minute INTEGER;
BEGIN
    -- Get current time in Windhoek timezone
    current_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    current_day := EXTRACT(DOW FROM current_time); -- 0=Sunday, 1=Monday, etc.
    current_hour := EXTRACT(HOUR FROM current_time);
    current_minute := EXTRACT(MINUTE FROM current_time);
    
    -- Exchange is open Monday 10:05 to Sunday 23:59
    IF current_day = 0 THEN  -- Sunday
        RETURN current_hour < 23 OR (current_hour = 23 AND current_minute < 59);
    ELSIF current_day = 1 THEN  -- Monday
        RETURN current_hour > 10 OR (current_hour = 10 AND current_minute >= 5);
    ELSE  -- Tuesday to Saturday
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update place_buy_order to check exchange status
CREATE OR REPLACE FUNCTION place_buy_order(p_user_uuid UUID, p_total_amount NUMERIC)
RETURNS JSON AS $$
DECLARE
    current_price NUMERIC;
    user_balance NUMERIC;
    new_order_id UUID;
BEGIN
    -- Check if exchange is open
    IF NOT is_exchange_open() THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Exchange is currently closed. Trading resumes Monday at 10:05 (Windhoek time).',
            'error_code', 'EXCHANGE_CLOSED'
        );
    END IF;
    
    -- Validate amount
    IF p_total_amount <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid amount. Must be greater than 0.',
            'error_code', 'INVALID_AMOUNT'
        );
    END IF;
    
    -- Get current price
    SELECT get_current_share_price() INTO current_price;
    
    -- Check user balance
    SELECT buy_wallet INTO user_balance
    FROM user_shares
    WHERE user_uuid = p_user_uuid;
    
    IF user_balance IS NULL THEN
        -- Create user_shares record if it doesn't exist
        INSERT INTO user_shares (user_uuid, buy_wallet)
        VALUES (p_user_uuid, 0);
        user_balance := 0;
    END IF;
    
    IF user_balance < p_total_amount THEN
        RETURN json_build_object(
            'success', false,
            'message', format('Insufficient balance. Available: N$%s, Required: N$%s', user_balance, p_total_amount),
            'error_code', 'INSUFFICIENT_BALANCE'
        );
    END IF;
    
    -- Deduct from buy wallet
    UPDATE user_shares
    SET buy_wallet = buy_wallet - p_total_amount,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid;
    
    -- Create buy order
    new_order_id := gen_random_uuid();
    INSERT INTO buy_orders (
        id, user_uuid, total_amount, price_per_share, status
    ) VALUES (
        new_order_id, p_user_uuid, p_total_amount, current_price, 'pending'
    );
    
    RETURN json_build_object(
        'success', true,
        'message', format('Buy order placed successfully for N$%s', p_total_amount),
        'order_id', new_order_id,
        'amount', p_total_amount,
        'price_per_share', current_price,
        'estimated_shares', ROUND(p_total_amount / current_price, 4)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error placing buy order: ' || SQLERRM,
            'error_code', 'BUY_ORDER_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update place_sell_order to check exchange status
CREATE OR REPLACE FUNCTION place_sell_order(p_user_uuid UUID, p_shares NUMERIC)
RETURNS JSON AS $$
DECLARE
    current_price NUMERIC;
    user_shares_balance NUMERIC;
    new_order_id UUID;
    total_value NUMERIC;
BEGIN
    -- Check if exchange is open
    IF NOT is_exchange_open() THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Exchange is currently closed. Trading resumes Monday at 10:05 (Windhoek time).',
            'error_code', 'EXCHANGE_CLOSED'
        );
    END IF;
    
    -- Validate shares
    IF p_shares <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid number of shares. Must be greater than 0.',
            'error_code', 'INVALID_SHARES'
        );
    END IF;
    
    -- Get current price
    SELECT get_current_share_price() INTO current_price;
    
    -- Check user shares balance
    SELECT hold_post INTO user_shares_balance
    FROM user_shares
    WHERE user_uuid = p_user_uuid;
    
    IF user_shares_balance IS NULL THEN
        -- Create user_shares record if it doesn't exist
        INSERT INTO user_shares (user_uuid, hold_post)
        VALUES (p_user_uuid, 0);
        user_shares_balance := 0;
    END IF;
    
    IF user_shares_balance < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', format('Insufficient shares. Available: %s, Required: %s', user_shares_balance, p_shares),
            'error_code', 'INSUFFICIENT_SHARES'
        );
    END IF;
    
    -- Deduct from hold_post wallet
    UPDATE user_shares
    SET hold_post = hold_post - p_shares,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid;
    
    -- Calculate total value
    total_value := p_shares * current_price;
    
    -- Create sell order
    new_order_id := gen_random_uuid();
    INSERT INTO sell_orders (
        id, user_uuid, shares_available, shares_remaining, price_per_share, status,
        expires_at
    ) VALUES (
        new_order_id, p_user_uuid, p_shares, p_shares, current_price, 'available',
        NOW() + INTERVAL '7 days' -- Expires in 1 week
    );
    
    RETURN json_build_object(
        'success', true,
        'message', format('Sell order placed successfully for %s shares', p_shares),
        'order_id', new_order_id,
        'shares', p_shares,
        'price_per_share', current_price,
        'total_value', total_value
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error placing sell order: ' || SQLERRM,
            'error_code', 'SELL_ORDER_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== EXCHANGE TRADING HOURS SETUP COMPLETE ===';
    RAISE NOTICE 'Exchange status table created/verified';
    RAISE NOTICE 'Order tables created/verified with week_start columns';
    RAISE NOTICE 'User shares table created/verified';
    RAISE NOTICE 'Indexes created for better performance';
    RAISE NOTICE 'Functions created for exchange management';
    RAISE NOTICE '';
    RAISE NOTICE 'Current schedule (Africa/Windhoek timezone):';
    RAISE NOTICE '- Sunday 23:59: Close exchange & clear orders';
    RAISE NOTICE '- Monday 09:30: Clear order history';
    RAISE NOTICE '- Monday 10:03: Calculate share price';
    RAISE NOTICE '- Monday 10:05: Open exchange';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions available:';
    RAISE NOTICE '- is_exchange_open()';
    RAISE NOTICE '- place_buy_order(user_uuid, amount)';
    RAISE NOTICE '- place_sell_order(user_uuid, shares)';
    RAISE NOTICE '- get_exchange_status()';
END $$;
