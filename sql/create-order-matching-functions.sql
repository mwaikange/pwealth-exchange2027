-- Order matching functions for Phase 6 Exchange Logic
-- Run this after creating the exchange tables

-- Function to place a buy order and attempt immediate matching
CREATE OR REPLACE FUNCTION place_buy_order(
    p_user_uuid UUID,
    p_total_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
    current_price NUMERIC;
    shares_requested NUMERIC;
    buy_order_id UUID;
    total_matched_shares NUMERIC := 0;
    total_matched_amount NUMERIC := 0;
    user_buy_balance NUMERIC;
    sell_order RECORD;
    shares_to_match NUMERIC;
    amount_to_match NUMERIC;
    remaining_shares NUMERIC;
    remaining_amount NUMERIC;
    result JSON;
BEGIN
    -- Validate minimum amount
    IF p_total_amount < 50 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum buy order is N$50',
            'error_code', 'MIN_AMOUNT'
        );
    END IF;

    -- Get current share price
    current_price := get_current_share_price();
    shares_requested := FLOOR(p_total_amount / current_price);
    
    IF shares_requested = 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Amount too small to buy any shares at current price',
            'error_code', 'INSUFFICIENT_AMOUNT'
        );
    END IF;

    -- Check user's buy wallet balance
    SELECT get_user_wallet_shares(p_user_uuid, 'buy_wallet') INTO user_buy_balance;
    
    IF user_buy_balance < p_total_amount THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient funds in Buy Wallet',
            'error_code', 'INSUFFICIENT_FUNDS'
        );
    END IF;

    -- Deduct funds from buy wallet immediately
    UPDATE user_shares 
    SET shares = shares - p_total_amount
    WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

    -- Create buy order
    INSERT INTO buy_orders (
        user_uuid, shares_requested, total_amount, price_per_share, status
    ) VALUES (
        p_user_uuid, shares_requested, p_total_amount, current_price, 'pending'
    ) RETURNING id INTO buy_order_id;

    -- Initialize remaining amounts
    remaining_shares := shares_requested;
    remaining_amount := p_total_amount;

    -- Try to match with existing sell orders (FIFO - oldest first)
    FOR sell_order IN 
        SELECT * FROM sell_orders 
        WHERE status = 'available' 
        AND shares_remaining > 0
        AND expires_at > NOW()
        ORDER BY created_at ASC
    LOOP
        -- Calculate how many shares we can match
        shares_to_match := LEAST(remaining_shares, sell_order.shares_remaining);
        amount_to_match := shares_to_match * current_price;

        -- Create matched order record
        INSERT INTO matched_orders (
            buy_order_id, sell_order_id, buyer_uuid, seller_uuid,
            shares_matched, price_per_share, total_amount
        ) VALUES (
            buy_order_id, sell_order.id, p_user_uuid, sell_order.user_uuid,
            shares_to_match, current_price, amount_to_match
        );

        -- Update sell order
        UPDATE sell_orders 
        SET 
            shares_remaining = shares_remaining - shares_to_match,
            status = CASE 
                WHEN shares_remaining - shares_to_match = 0 THEN 'matched'
                ELSE 'available'
            END
        WHERE id = sell_order.id;

        -- Transfer shares: seller's post-hold -> buyer's pre-hold
        UPDATE user_shares 
        SET shares = shares - shares_to_match
        WHERE user_uuid = sell_order.user_uuid AND wallet_type = 'hold_post';

        INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
        VALUES (p_user_uuid, 'hold_pre', shares_to_match, 'purchase')
        ON CONFLICT (user_uuid, wallet_type)
        DO UPDATE SET shares = user_shares.shares + EXCLUDED.shares;

        -- Transfer funds to seller's cashout wallet
        INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
        VALUES (sell_order.user_uuid, 'cashout_wallet', amount_to_match, 'sale')
        ON CONFLICT (user_uuid, wallet_type)
        DO UPDATE SET shares = user_shares.shares + EXCLUDED.shares;

        -- Log transactions
        INSERT INTO share_transactions (
            user_uuid, transaction_type, shares, price_per_share, total_amount,
            to_wallet, status, description
        ) VALUES 
        (p_user_uuid, 'buy', shares_to_match, current_price, amount_to_match,
         'hold_pre', 'completed', 'Share purchase - matched order'),
        (sell_order.user_uuid, 'sell', shares_to_match, current_price, amount_to_match,
         'cashout_wallet', 'completed', 'Share sale - matched order');

        -- Update totals
        total_matched_shares := total_matched_shares + shares_to_match;
        total_matched_amount := total_matched_amount + amount_to_match;
        remaining_shares := remaining_shares - shares_to_match;
        remaining_amount := remaining_amount - amount_to_match;

        -- Break if fully matched
        EXIT WHEN remaining_shares = 0;
    END LOOP;

    -- Update buy order status
    UPDATE buy_orders 
    SET 
        shares_filled = total_matched_shares,
        amount_filled = total_matched_amount,
        status = CASE 
            WHEN total_matched_shares = shares_requested THEN 'completed'
            WHEN total_matched_shares > 0 THEN 'matched'
            ELSE 'pending'
        END
    WHERE id = buy_order_id;

    -- If not fully matched, refund remaining amount and cancel order
    IF remaining_shares > 0 THEN
        -- Refund unused amount
        UPDATE user_shares 
        SET shares = shares + remaining_amount
        WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

        -- Cancel the order
        UPDATE buy_orders 
        SET status = 'cancelled'
        WHERE id = buy_order_id;

        result := json_build_object(
            'success', true,
            'message', format('Partially matched: %s shares for N$%s. Remaining N$%s refunded.', 
                total_matched_shares, total_matched_amount, remaining_amount),
            'order_id', buy_order_id,
            'shares_matched', total_matched_shares,
            'amount_matched', total_matched_amount,
            'shares_remaining', remaining_shares,
            'amount_refunded', remaining_amount
        );
    ELSE
        result := json_build_object(
            'success', true,
            'message', format('Order completed: %s shares purchased for N$%s', 
                total_matched_shares, total_matched_amount),
            'order_id', buy_order_id,
            'shares_matched', total_matched_shares,
            'amount_matched', total_matched_amount
        );
    END IF;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Rollback: refund the deducted amount
        UPDATE user_shares 
        SET shares = shares + p_total_amount
        WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';
        
        RETURN json_build_object(
            'success', false,
            'message', 'Error processing buy order: ' || SQLERRM,
            'error_code', 'PROCESSING_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to place a sell order
CREATE OR REPLACE FUNCTION place_sell_order(
    p_user_uuid UUID,
    p_price_per_share NUMERIC,
    p_shares NUMERIC
)
RETURNS JSON AS $$
DECLARE
    current_price NUMERIC;
    total_amount NUMERIC;
    user_post_hold_balance NUMERIC;
    sell_order_id UUID;
    expires_at TIMESTAMPTZ;
BEGIN
    -- Use the provided price or get current price
    current_price := COALESCE(p_price_per_share, get_current_share_price());
    total_amount := p_shares * current_price;
    
    -- Validate minimum amount
    IF total_amount < 50 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum sell order value is N$50',
            'error_code', 'MIN_AMOUNT'
        );
    END IF;

    -- Check user's post-hold balance
    SELECT COALESCE(shares, 0) FROM user_shares 
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post'
    INTO user_post_hold_balance;

    -- If no wallet exists, create it with 0 balance
    IF user_post_hold_balance IS NULL THEN
        INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
        VALUES (p_user_uuid, 'hold_post', 0, 'wallet_creation')
        ON CONFLICT (user_uuid, wallet_type) DO NOTHING;
        user_post_hold_balance := 0;
    END IF;
    
    IF user_post_hold_balance < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient shares in Post-Hold wallet',
            'error_code', 'INSUFFICIENT_SHARES'
        );
    END IF;

    -- Lock shares by deducting from post-hold wallet
    UPDATE user_shares 
    SET shares = shares - p_shares,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';

    -- Verify the update worked
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to lock shares - wallet not found',
            'error_code', 'WALLET_NOT_FOUND'
        );
    END IF;

    -- Calculate expiry (Sunday 23:59 of current week)
    expires_at := DATE_TRUNC('week', NOW()) + INTERVAL '6 days' + INTERVAL '23 hours 59 minutes';

    -- Create sell order with CORRECT column names
    INSERT INTO sell_orders (
        user_uuid, shares_available, shares_remaining, total_amount, 
        price_per_share, status, expires_at
    ) VALUES (
        p_user_uuid, p_shares, p_shares, total_amount,
        current_price, 'available', expires_at
    ) RETURNING id INTO sell_order_id;

    -- Log transaction
    INSERT INTO share_transactions (
        user_uuid, transaction_type, shares, price_per_share, total_amount,
        from_wallet, status, description, reference_id
    ) VALUES (
        p_user_uuid, 'sell', p_shares, current_price, total_amount,
        'hold_post', 'pending', 'Sell order placed - shares locked', 
        'SELL-' || sell_order_id
    );

    RETURN json_build_object(
        'success', true,
        'message', format('Sell order placed: %s shares at N$%s each (Total: N$%s)', 
            p_shares, current_price, total_amount),
        'order_id', sell_order_id,
        'shares_listed', p_shares,
        'price_per_share', current_price,
        'total_value', total_amount,
        'expires_at', expires_at
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Rollback: return shares to post-hold wallet
        UPDATE user_shares 
        SET shares = shares + p_shares
        WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';
        
        RETURN json_build_object(
            'success', false,
            'message', 'Error processing sell order: ' || SQLERRM,
            'error_code', 'PROCESSING_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire old sell orders (run weekly)
CREATE OR REPLACE FUNCTION expire_old_sell_orders()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
    expired_order RECORD;
BEGIN
    -- Find and process expired orders
    FOR expired_order IN 
        SELECT * FROM sell_orders 
        WHERE status = 'available' 
        AND expires_at <= NOW()
    LOOP
        -- Return unsold shares to user's post-hold wallet
        UPDATE user_shares 
        SET shares = shares + expired_order.shares_remaining
        WHERE user_uuid = expired_order.user_uuid AND wallet_type = 'hold_post';

        -- Mark order as expired
        UPDATE sell_orders 
        SET status = 'expired'
        WHERE id = expired_order.id;

        -- Log transaction
        INSERT INTO share_transactions (
            user_uuid, transaction_type, shares, price_per_share, total_amount,
            to_wallet, status, description, reference_id
        ) VALUES (
            expired_order.user_uuid, 'sell', expired_order.shares_remaining, 
            expired_order.price_per_share, expired_order.shares_remaining * expired_order.price_per_share,
            'hold_post', 'expired', 'Sell order expired - shares returned', 
            'EXP-' || expired_order.id
        );

        expired_count := expired_count + 1;
    END LOOP;

    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
