-- 1. Create the place_buy_order function (with correct signature)
CREATE OR REPLACE FUNCTION place_buy_order(
    p_user_uuid UUID,
    p_price_per_share NUMERIC,
    p_total_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
    shares_requested NUMERIC;
    user_balance NUMERIC;
    buy_order_id UUID;
BEGIN
    -- Calculate shares requested
    shares_requested := p_total_amount / p_price_per_share;
    
    -- Validate minimum
    IF p_total_amount < 50 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum purchase is N$50'
        );
    END IF;
    
    -- Check user balance
    SELECT COALESCE(shares, 0) FROM user_shares 
    WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet'
    INTO user_balance;
    
    IF user_balance < p_total_amount THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient funds in Buy Wallet'
        );
    END IF;
    
    -- IMPORTANT: Only deduct funds, don't credit shares yet!
    UPDATE user_shares 
    SET shares = shares - p_total_amount,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';
    
    -- Create buy order (PENDING, not filled)
    INSERT INTO buy_orders (
        user_uuid, total_amount, price_per_share, 
        shares_requested, status, created_at
    ) VALUES (
        p_user_uuid, p_total_amount, p_price_per_share,
        shares_requested, 'pending', NOW()
    ) RETURNING id INTO buy_order_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Buy order queued for ' || shares_requested || ' shares at N$' || p_price_per_share,
        'order_id', buy_order_id,
        'shares_requested', shares_requested,
        'status', 'pending'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the get_current_share_price function
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    -- Get the latest share price from your pricing system
    SELECT price_per_share INTO current_price
    FROM weekly_share_prices 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Default to 100 if no price found
    IF current_price IS NULL THEN
        current_price := 100;
    END IF;
    
    RETURN current_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the place_sell_order function
CREATE OR REPLACE FUNCTION place_sell_order(
    p_user_uuid UUID,
    p_price_per_share NUMERIC,
    p_shares NUMERIC
)
RETURNS JSON AS $$
DECLARE
    user_shares_balance NUMERIC;
    sell_order_id UUID;
BEGIN
    -- Validate minimum
    IF p_shares < 0.5 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum sell is 0.5 shares'
        );
    END IF;
    
    -- Check user shares balance
    SELECT COALESCE(shares, 0) FROM user_shares 
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post'
    INTO user_shares_balance;
    
    IF user_shares_balance < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient shares in Post-Hold Wallet'
        );
    END IF;
    
    -- Deduct shares from post-hold wallet
    UPDATE user_shares 
    SET shares = shares - p_shares,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';
    
    -- Create sell order
    INSERT INTO sell_orders (
        user_uuid, shares_available, shares_remaining, price_per_share, 
        status, created_at
    ) VALUES (
        p_user_uuid, p_shares, p_shares, p_price_per_share,
        'available', NOW()
    ) RETURNING id INTO sell_order_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Sell order created for ' || p_shares || ' shares at N$' || p_price_per_share,
        'order_id', sell_order_id,
        'shares', p_shares,
        'status', 'available'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
