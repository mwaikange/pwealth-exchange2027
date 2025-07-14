-- ==============================================
-- STEP 1: FIX BUY/SELL FUNCTIONS AND MISSING WALLET
-- ==============================================

BEGIN;

-- ==============================================
-- FIX: place_buy_order_with_delay function
-- Issue: "null value in column "shares_requested" of relation "buy_orders" violates not-null constraint"
-- Solution: Calculate shares_requested and include it in the INSERT statement.
-- ==============================================
CREATE OR REPLACE FUNCTION place_buy_order_with_delay(
    p_user_uuid UUID,
    p_price_per_share NUMERIC,
    p_total_amount NUMERIC,
    p_delay_seconds INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
    v_buy_order_id UUID;
    v_shares_requested NUMERIC;
    v_current_buy_wallet_balance NUMERIC;
    v_buy_ref TEXT;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_uuid) THEN
        RETURN json_build_object('success', FALSE, 'message', 'User not found.');
    END IF;

    -- Get current buy_wallet balance
    SELECT shares INTO v_current_buy_wallet_balance
    FROM user_shares
    WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

    -- Check for sufficient funds
    IF v_current_buy_wallet_balance IS NULL OR v_current_buy_wallet_balance < p_total_amount THEN
        RETURN json_build_object('success', FALSE, 'message', 'Insufficient funds in buy wallet.');
    END IF;

    -- Calculate shares_requested (ensure it's not null)
    IF p_price_per_share <= 0 THEN
        RETURN json_build_object('success', FALSE, 'message', 'Price per share must be positive.');
    END IF;
    v_shares_requested := p_total_amount / p_price_per_share;

    -- Generate buy reference
    v_buy_ref := generate_order_reference('Buy');

    -- Deduct amount from buy_wallet
    UPDATE user_shares
    SET shares = shares - p_total_amount, updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

    -- Insert the buy order
    INSERT INTO buy_orders (user_uuid, total_amount, price_per_share, status, shares_requested, buy_ref)
    VALUES (p_user_uuid, p_total_amount, p_price_per_share, 'pending'::order_status, v_shares_requested, v_buy_ref)
    RETURNING id INTO v_buy_order_id;

    -- Schedule the order matching (if delay is positive)
    IF p_delay_seconds > 0 THEN
        PERFORM pg_cron.schedule(
            'match_buy_order_' || v_buy_order_id,
            '@after ' || p_delay_seconds || ' seconds',
            'SELECT match_specific_buy_order(''' || v_buy_order_id || '''::UUID);'
        );
    ELSE
        -- If no delay, match immediately
        PERFORM match_specific_buy_order(v_buy_order_id);
    END IF;

    RETURN json_build_object('success', TRUE, 'message', 'Buy order placed successfully. Order ID: ' || v_buy_order_id || ', Ref: ' || v_buy_ref);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', FALSE, 'message', 'Error processing buy order: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- FIX: place_sell_order function
-- Issue: "invalid input value for enum wallet_type: "hold_post""
-- Solution: Use the correct enum value 'hold_wallet_post_hold'.
-- ==============================================
CREATE OR REPLACE FUNCTION place_sell_order(
    p_price_per_share NUMERIC,
    p_shares NUMERIC,
    p_user_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    v_sell_order_id UUID;
    v_current_hold_post_balance NUMERIC;
    v_sell_ref TEXT;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_uuid) THEN
        RETURN json_build_object('success', FALSE, 'message', 'User not found.');
    END IF;

    -- Get current hold_wallet_post_hold balance
    SELECT shares INTO v_current_hold_post_balance
    FROM user_shares
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_post_hold'; -- Corrected wallet type

    -- Check for sufficient shares
    IF v_current_hold_post_balance IS NULL OR v_current_hold_post_balance < p_shares THEN
        RETURN json_build_object('success', FALSE, 'message', 'Insufficient shares in Post-Hold wallet.');
    END IF;

    -- Generate sell reference
    v_sell_ref := generate_order_reference('Sell');

    -- Deduct shares from hold_wallet_post_hold
    UPDATE user_shares
    SET shares = shares - p_shares, updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_post_hold'; -- Corrected wallet type

    -- Insert the sell order
    INSERT INTO sell_orders (user_uuid, shares_available, shares_remaining, price_per_share, status, sell_ref)
    VALUES (p_user_uuid, p_shares, p_shares, p_price_per_share, 'pending'::order_status, v_sell_ref)
    RETURNING id INTO v_sell_order_id;

    RETURN json_build_object('success', TRUE, 'message', 'Sell order placed successfully. Order ID: ' || v_sell_order_id || ', Ref: ' || v_sell_ref);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', FALSE, 'message', 'Error processing sell order: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- FIX: Missing hold_wallet_pre_hold for 3 specific users
-- Issue: The 3 test users (now live users) are missing 'hold_wallet_pre_hold' entries.
-- Solution: Insert 'hold_wallet_pre_hold' with 0 shares if it doesn't exist for them.
-- ==============================================
INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
SELECT
    u.id,
    'hold_wallet_pre_hold'::wallet_type,
    0.0000,
    'initial_setup',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email IN (
    'mwaikange@gmail.com',
    'charitywinstaan93@gmail.com',
    'luwa@yopmail.com'
)
ON CONFLICT (user_uuid, wallet_type) DO NOTHING; -- Do nothing if the entry already exists

COMMIT;

SELECT 'DATABASE FUNCTIONS AND WALLETS FIXED!' as status;
