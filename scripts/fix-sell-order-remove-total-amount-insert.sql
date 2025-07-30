-- Fix sell order function to actually process orders
CREATE OR REPLACE FUNCTION place_sell_order(
    p_user_uuid UUID,
    p_shares DECIMAL(20,8)
) RETURNS JSON AS $$
DECLARE
    v_sell_ref TEXT;
    v_current_price DECIMAL(10,2);
    v_calculated_total_amount DECIMAL(20,2);
    v_user_shares DECIMAL(20,8);
    v_order_id UUID;
    v_shares_deducted DECIMAL(20,8);
    v_result JSON;
BEGIN
    -- Generate unique sell reference
    v_sell_ref := 'SELL_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(p_user_uuid::TEXT, 1, 8);
    
    -- Get current share price
    SELECT current_price INTO v_current_price 
    FROM current_pricing_info 
    ORDER BY last_updated DESC 
    LIMIT 1;
    
    IF v_current_price IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Unable to get current share price'
        );
    END IF;
    
    -- Calculate total amount for validation and logging
    v_calculated_total_amount := p_shares * v_current_price;
    
    -- Validate minimum amount (if needed)
    IF v_calculated_total_amount < 1.00 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum sell order amount is N$1.00'
        );
    END IF;
    
    -- Check user has enough shares in hold_wallet_post_hold
    SELECT COALESCE(shares, 0) INTO v_user_shares
    FROM user_shares 
    WHERE user_uuid = p_user_uuid 
    AND wallet_type = 'hold_wallet_post_hold';
    
    IF v_user_shares < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient shares in Hold Wallet (Post-Hold). Available: ' || COALESCE(v_user_shares, 0) || ', Requested: ' || p_shares
        );
    END IF;
    
    -- 1. DEDUCT SHARES FROM HOLD WALLET FIRST
    UPDATE user_shares 
    SET shares = shares - p_shares,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid 
    AND wallet_type = 'hold_wallet_post_hold'
    AND shares >= p_shares;
    
    -- Verify deduction worked
    GET DIAGNOSTICS v_shares_deducted = ROW_COUNT;
    IF v_shares_deducted = 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to deduct shares from hold wallet'
        );
    END IF;
    
    -- 2. INSERT SELL ORDER (database calculates total_amount automatically)
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
        p_shares,
        v_current_price,
        'available',
        DEFAULT, -- Uses database default for expiration
        v_sell_ref,
        NOW(),
        NOW()
    ) RETURNING id INTO v_order_id;
    
    -- 3. LOG TRANSACTION
    INSERT INTO share_transactions (
        user_uuid,
        transaction_type,
        shares,
        price_per_share,
        total_amount,
        reference_id,
        wallet_from,
        wallet_to,
        status,
        created_at
    ) VALUES (
        p_user_uuid,
        'sell_order_placed',
        p_shares,
        v_current_price,
        v_calculated_total_amount,
        v_order_id::TEXT,
        'hold_wallet_post_hold',
        'market',
        'completed',
        NOW()
    );
    
    -- 4. ATTEMPT ORDER MATCHING
    BEGIN
        PERFORM match_orders();
    EXCEPTION WHEN OTHERS THEN
        -- Log matching error but don't fail the order
        RAISE NOTICE 'Order matching failed: %', SQLERRM;
    END;
    
    -- Return success with details
    RETURN json_build_object(
        'success', true,
        'message', 'Sell order placed successfully',
        'order_id', v_order_id,
        'sell_ref', v_sell_ref,
        'shares', p_shares,
        'price_per_share', v_current_price,
        'estimated_total', v_calculated_total_amount
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Rollback any changes and return error
    RETURN json_build_object(
        'success', false,
        'message', 'Error processing sell order: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;
