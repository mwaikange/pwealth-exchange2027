-- Update order placement functions to check if exchange is open
-- This ensures orders can only be placed when exchange is trading

-- Update place_buy_order function to check exchange status
CREATE OR REPLACE FUNCTION place_buy_order(p_user_uuid UUID, p_total_amount NUMERIC)
RETURNS JSON AS $$
DECLARE
    user_buy_balance NUMERIC;
    current_price NUMERIC;
    estimated_shares NUMERIC;
    new_order_id UUID;
    result JSON;
    exchange_open BOOLEAN;
BEGIN
    -- Check if exchange is open for trading
    SELECT is_exchange_open() INTO exchange_open;
    
    IF NOT exchange_open THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Exchange is currently closed. Trading resumes Monday at 09:25.',
            'error_code', 'EXCHANGE_CLOSED'
        );
    END IF;

    -- Validate input
    IF p_total_amount <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Amount must be greater than 0',
            'error_code', 'INVALID_AMOUNT'
        );
    END IF;

    -- Get user's buy wallet balance
    SELECT COALESCE(shares, 0) INTO user_buy_balance
    FROM user_shares 
    WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

    -- Check if user has sufficient balance
    IF user_buy_balance < p_total_amount THEN
        RETURN json_build_object(
            'success', false,
            'message', format('Insufficient balance. Available: N$%s, Required: N$%s', 
                user_buy_balance, p_total_amount),
            'error_code', 'INSUFFICIENT_BALANCE'
        );
    END IF;

    -- Get current share price
    current_price := get_current_share_price();
    estimated_shares := p_total_amount / current_price;

    -- Deduct amount from buy wallet
    UPDATE user_shares 
    SET shares = shares - p_total_amount, updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

    -- Create buy order
    new_order_id := gen_random_uuid();
    INSERT INTO buy_orders (
        id, user_uuid, total_amount, price_per_share, 
        status, amount_filled, created_at, updated_at
    ) VALUES (
        new_order_id, p_user_uuid, p_total_amount, current_price,
        'pending', 0, NOW(), NOW()
    );

    -- Log transaction
    INSERT INTO share_transactions (
        user_uuid, transaction_type, shares, price_per_share, total_amount,
        from_wallet, status, description, reference_id
    ) VALUES (
        p_user_uuid, 'buy', estimated_shares, current_price, p_total_amount,
        'buy_wallet', 'pending', 'Buy order placed', 'BUY-' || new_order_id
    );

    -- Try to match with existing sell orders
    PERFORM match_buy_order_with_sells(new_order_id);

    result := json_build_object(
        'success', true,
        'message', format('Buy order placed for N$%s (≈%s shares at N$%s per share)', 
            p_total_amount, estimated_shares, current_price),
        'order_id', new_order_id,
        'total_amount', p_total_amount,
        'estimated_shares', estimated_shares,
        'price_per_share', current_price
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error placing buy order: ' || SQLERRM,
            'error_code', 'ORDER_PLACEMENT_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update place_sell_order function to check exchange status
CREATE OR REPLACE FUNCTION place_sell_order(p_user_uuid UUID, p_shares NUMERIC)
RETURNS JSON AS $$
DECLARE
    user_hold_balance NUMERIC;
    current_price NUMERIC;
    estimated_value NUMERIC;
    new_order_id UUID;
    expires_at TIMESTAMPTZ;
    result JSON;
    exchange_open BOOLEAN;
BEGIN
    -- Check if exchange is open for trading
    SELECT is_exchange_open() INTO exchange_open;
    
    IF NOT exchange_open THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Exchange is currently closed. Trading resumes Monday at 09:25.',
            'error_code', 'EXCHANGE_CLOSED'
        );
    END IF;

    -- Validate input
    IF p_shares <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Shares must be greater than 0',
            'error_code', 'INVALID_SHARES'
        );
    END IF;

    -- Get user's hold_post wallet balance
    SELECT COALESCE(shares, 0) INTO user_hold_balance
    FROM user_shares 
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';

    -- Check if user has sufficient shares
    IF user_hold_balance < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', format('Insufficient shares. Available: %s, Required: %s', 
                user_hold_balance, p_shares),
            'error_code', 'INSUFFICIENT_SHARES'
        );
    END IF;

    -- Get current share price
    current_price := get_current_share_price();
    estimated_value := p_shares * current_price;

    -- Calculate expiry (Sunday 23:59 of current week)
    expires_at := DATE_TRUNC('week', NOW()) + INTERVAL '6 days' + INTERVAL '23 hours 59 minutes';

    -- Deduct shares from hold_post wallet
    UPDATE user_shares 
    SET shares = shares - p_shares, updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';

    -- Create sell order
    new_order_id := gen_random_uuid();
    INSERT INTO sell_orders (
        id, user_uuid, shares_available, shares_remaining, price_per_share,
        status, expires_at, created_at, updated_at
    ) VALUES (
        new_order_id, p_user_uuid, p_shares, p_shares, current_price,
        'available', expires_at, NOW(), NOW()
    );

    -- Log transaction
    INSERT INTO share_transactions (
        user_uuid, transaction_type, shares, price_per_share, total_amount,
        from_wallet, status, description, reference_id
    ) VALUES (
        p_user_uuid, 'sell', p_shares, current_price, estimated_value,
        'hold_post', 'available', 'Sell order placed', 'SELL-' || new_order_id
    );

    -- Try to match with existing buy orders
    PERFORM match_sell_order_with_buys(new_order_id);

    result := json_build_object(
        'success', true,
        'message', format('Sell order placed for %s shares (≈N$%s at N$%s per share)', 
            p_shares, estimated_value, current_price),
        'order_id', new_order_id,
        'shares_available', p_shares,
        'estimated_value', estimated_value,
        'price_per_share', current_price,
        'expires_at', expires_at
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error placing sell order: ' || SQLERRM,
            'error_code', 'ORDER_PLACEMENT_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
