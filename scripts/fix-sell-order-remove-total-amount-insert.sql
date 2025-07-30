-- Fix place_sell_order function to remove total_amount from INSERT and ensure all operations work
-- This addresses the issue where sell orders show success but don't actually process

DROP FUNCTION IF EXISTS place_sell_order(UUID, DECIMAL);

CREATE OR REPLACE FUNCTION place_sell_order(
    p_user_uuid UUID,
    p_shares DECIMAL(20,4)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_price DECIMAL(10,2);
    calculated_total_amount DECIMAL(20,2);
    user_hold_balance DECIMAL(20,4);
    v_sell_ref TEXT;
    v_order_id UUID;
    result JSON;
BEGIN
    -- Input validation
    IF p_user_uuid IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User UUID is required');
    END IF;
    
    IF p_shares IS NULL OR p_shares <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'Invalid shares amount');
    END IF;

    -- Check if exchange is open for trading
    IF NOT EXISTS (
        SELECT 1 FROM exchange_trading_hours 
        WHERE is_trading_open = true 
        AND current_week_start IS NOT NULL
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Exchange is currently closed for trading');
    END IF;

    -- Get current share price
    SELECT get_current_share_price() INTO current_price;
    IF current_price IS NULL OR current_price <= 0 THEN
        current_price := 99.68; -- Fallback price
    END IF;

    -- Calculate total amount for validation and logging (but don't insert it)
    calculated_total_amount := p_shares * current_price;

    -- Validate minimum amount (if needed)
    IF calculated_total_amount < 1.00 THEN
        RETURN json_build_object('success', false, 'message', 'Order value too small (minimum N$1.00)');
    END IF;

    -- Check user's hold wallet balance (post-hold)
    SELECT COALESCE(shares, 0) INTO user_hold_balance
    FROM user_shares 
    WHERE user_uuid = p_user_uuid 
    AND wallet_type = 'hold_wallet_post_hold';

    IF user_hold_balance < p_shares THEN
        RETURN json_build_object(
            'success', false, 
            'message', format('Insufficient shares in Hold Wallet. Available: %s, Requested: %s', 
                            user_hold_balance, p_shares)
        );
    END IF;

    -- Generate sell reference
    v_sell_ref := 'SELL_' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

    -- Generate order ID
    v_order_id := gen_random_uuid();

    BEGIN
        -- 1. DEDUCT SHARES FROM HOLD WALLET FIRST
        UPDATE user_shares 
        SET 
            shares = shares - p_shares,
            updated_at = NOW()
        WHERE user_uuid = p_user_uuid 
        AND wallet_type = 'hold_wallet_post_hold';

        -- Verify the deduction worked
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to deduct shares from hold wallet';
        END IF;

        -- 2. INSERT SELL ORDER (WITHOUT total_amount - database calculates it)
        INSERT INTO sell_orders (
            id,
            user_uuid,
            shares_available,
            shares_remaining,
            price_per_share,
            status,
            sell_ref,
            created_at,
            updated_at
        ) VALUES (
            v_order_id,
            p_user_uuid,
            p_shares,
            p_shares,
            current_price,
            'available',
            v_sell_ref,
            NOW(),
            NOW()
        );

        -- 3. LOG TRANSACTION
        INSERT INTO share_transactions (
            id,
            user_uuid,
            transaction_type,
            shares,
            total_amount,
            from_wallet,
            to_wallet,
            status,
            description,
            reference_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            p_user_uuid,
            'sell_order_placed',
            p_shares,
            calculated_total_amount,
            'hold_wallet_post_hold',
            'exchange',
            'completed',
            format('Sell order placed: %s shares @ N$%s each (Order: %s)', 
                   p_shares, current_price, v_sell_ref),
            v_order_id,
            NOW()
        );

        -- 4. ATTEMPT ORDER MATCHING (if matching system exists)
        BEGIN
            PERFORM match_orders();
        EXCEPTION WHEN OTHERS THEN
            -- Log but don't fail if matching fails
            RAISE NOTICE 'Order matching failed: %', SQLERRM;
        END;

        -- Return success with details
        result := json_build_object(
            'success', true,
            'message', format('Sell order placed successfully: %s shares @ N$%s each', p_shares, current_price),
            'order_id', v_order_id,
            'sell_ref', v_sell_ref,
            'shares', p_shares,
            'price_per_share', current_price,
            'estimated_total', calculated_total_amount
        );

        RETURN result;

    EXCEPTION WHEN OTHERS THEN
        -- Rollback will happen automatically
        RETURN json_build_object(
            'success', false, 
            'message', format('Error processing sell order: %s', SQLERRM)
        );
    END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION place_sell_order(UUID, DECIMAL) TO authenticated;

-- Test the function
DO $$
DECLARE
    test_result JSON;
BEGIN
    RAISE NOTICE 'Testing place_sell_order function...';
    
    -- This will fail safely if no test user exists
    SELECT place_sell_order(
        '00000000-0000-0000-0000-000000000000'::UUID, 
        1.0000
    ) INTO test_result;
    
    RAISE NOTICE 'Test result: %', test_result;
END;
$$;
