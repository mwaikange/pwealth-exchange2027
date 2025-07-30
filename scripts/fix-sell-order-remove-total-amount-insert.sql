-- Fix sell order function to actually work - remove total_amount from INSERT
-- This fixes the constraint error and ensures all operations are performed

CREATE OR REPLACE FUNCTION place_sell_order(
    p_user_uuid UUID,
    p_shares DECIMAL(20,8)
) RETURNS JSON AS $$
DECLARE
    v_sell_ref TEXT;
    v_order_id UUID;
    current_price DECIMAL(10,2);
    calculated_total_amount DECIMAL(20,2);
    v_current_shares DECIMAL(20,8);
    v_result JSON;
BEGIN
    -- Generate unique sell reference
    v_sell_ref := 'SELL_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(p_user_uuid::TEXT, 1, 8);
    
    -- Get current share price
    SELECT current_share_price INTO current_price FROM current_pricing_info LIMIT 1;
    IF current_price IS NULL THEN
        current_price := 99.68; -- Fallback price
    END IF;
    
    -- Calculate total amount for validation and logging (but don't insert it)
    calculated_total_amount := p_shares * current_price;
    
    -- Validate minimum amount
    IF calculated_total_amount < 10.00 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum sell order amount is N$10.00',
            'order_id', null,
            'sell_ref', null
        );
    END IF;
    
    -- Check if user has enough shares in hold_wallet_post_hold
    SELECT COALESCE(shares, 0) INTO v_current_shares
    FROM user_shares 
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_post_hold';
    
    IF v_current_shares < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient shares in Hold Wallet (Post-Hold). Available: ' || COALESCE(v_current_shares, 0) || ', Requested: ' || p_shares,
            'order_id', null,
            'sell_ref', null
        );
    END IF;
    
    -- STEP 1: DEDUCT SHARES FROM HOLD WALLET FIRST
    UPDATE user_shares 
    SET shares = shares - p_shares,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_post_hold';
    
    -- Verify the deduction worked
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to deduct shares from hold wallet',
            'order_id', null,
            'sell_ref', null
        );
    END IF;
    
    -- STEP 2: INSERT SELL ORDER (WITHOUT total_amount - database calculates it)
    INSERT INTO sell_orders (
        user_uuid,
        shares_available,
        shares_remaining,
        price_per_share,
        status,
        expires_at,
        sell_ref,
        created_at,
        updated_at
    ) VALUES (
        p_user_uuid,
        p_shares,
        p_shares, -- Initially all shares are remaining
        current_price,
        'available',
        DEFAULT, -- Use default expiration logic
        v_sell_ref,
        NOW(),
        NOW()
    ) RETURNING id INTO v_order_id;
    
    -- STEP 3: LOG TRANSACTION
    INSERT INTO share_transactions (
        user_uuid,
        transaction_type,
        shares,
        amount,
        reference_id,
        status,
        created_at
    ) VALUES (
        p_user_uuid,
        'sell_order_placed',
        p_shares,
        calculated_total_amount, -- Use calculated amount for logging
        v_order_id::TEXT,
        'completed',
        NOW()
    );
    
    -- STEP 4: ATTEMPT ORDER MATCHING
    PERFORM match_orders();
    
    -- Return success with details
    RETURN json_build_object(
        'success', true,
        'message', 'Sell order placed successfully for ' || p_shares || ' shares at N$' || current_price || ' per share',
        'order_id', v_order_id,
        'sell_ref', v_sell_ref,
        'shares', p_shares,
        'price_per_share', current_price,
        'estimated_total', calculated_total_amount
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback any changes and return error
        ROLLBACK;
        RETURN json_build_object(
            'success', false,
            'message', 'Error processing sell order: ' || SQLERRM,
            'order_id', null,
            'sell_ref', null
        );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION place_sell_order(UUID, DECIMAL) TO authenticated;

-- Test the function
DO $$
DECLARE
    test_result JSON;
BEGIN
    RAISE NOTICE 'Testing place_sell_order function...';
    
    -- This will fail with insufficient shares, but should not error
    SELECT place_sell_order(
        '00000000-0000-0000-0000-000000000000'::UUID,
        1.0000
    ) INTO test_result;
    
    RAISE NOTICE 'Test result: %', test_result;
END $$;
