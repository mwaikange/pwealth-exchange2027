-- Fix sell order function to actually work properly
-- Remove total_amount from INSERT statement and ensure all operations happen

CREATE OR REPLACE FUNCTION place_sell_order(
    p_user_uuid UUID,
    p_shares DECIMAL(20,8)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_price DECIMAL(10,2);
    calculated_total_amount DECIMAL(20,2);
    v_sell_ref TEXT;
    v_order_id UUID;
    v_transaction_id UUID;
    v_current_shares DECIMAL(20,8);
    result JSON;
BEGIN
    -- Start transaction
    BEGIN
        -- Get current share price
        SELECT get_current_share_price() INTO current_price;
        
        IF current_price IS NULL OR current_price <= 0 THEN
            RETURN json_build_object(
                'success', false,
                'message', 'Unable to get current share price'
            );
        END IF;

        -- Calculate total amount for validation and logging
        calculated_total_amount := p_shares * current_price;
        
        -- Validate minimum amount (if needed)
        IF calculated_total_amount < 1.00 THEN
            RETURN json_build_object(
                'success', false,
                'message', 'Minimum sell order amount is N$1.00'
            );
        END IF;

        -- Check if user has enough shares in hold_wallet_post_hold
        SELECT shares INTO v_current_shares
        FROM user_shares 
        WHERE user_uuid = p_user_uuid 
        AND wallet_type = 'hold_wallet_post_hold';
        
        IF v_current_shares IS NULL THEN
            v_current_shares := 0;
        END IF;
        
        IF v_current_shares < p_shares THEN
            RETURN json_build_object(
                'success', false,
                'message', 'Insufficient shares in Hold Wallet (Post-Hold). Available: ' || v_current_shares || ', Requested: ' || p_shares
            );
        END IF;

        -- Generate sell reference
        v_sell_ref := 'SELL_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(p_user_uuid::TEXT, 1, 8);

        -- 1. DEDUCT SHARES FROM HOLD WALLET FIRST
        UPDATE user_shares 
        SET shares = shares - p_shares,
            updated_at = NOW()
        WHERE user_uuid = p_user_uuid 
        AND wallet_type = 'hold_wallet_post_hold';
        
        -- Verify the deduction worked
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to deduct shares from hold wallet';
        END IF;

        -- 2. INSERT SELL ORDER (without total_amount - database calculates it)
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
            current_price,
            'available',
            DEFAULT,
            v_sell_ref,
            NOW(),
            NOW()
        ) RETURNING id INTO v_order_id;

        -- 3. LOG TRANSACTION
        INSERT INTO share_transactions (
            user_uuid,
            transaction_type,
            amount,
            shares,
            price_per_share,
            reference_id,
            status,
            created_at
        ) VALUES (
            p_user_uuid,
            'sell_order_placed',
            calculated_total_amount,
            p_shares,
            current_price,
            v_order_id::TEXT,
            'completed',
            NOW()
        ) RETURNING id INTO v_transaction_id;

        -- 4. ATTEMPT ORDER MATCHING
        PERFORM match_orders();

        -- Return success
        RETURN json_build_object(
            'success', true,
            'message', 'Sell order placed successfully',
            'order_id', v_order_id,
            'sell_ref', v_sell_ref,
            'shares', p_shares,
            'price_per_share', current_price,
            'estimated_total', calculated_total_amount,
            'transaction_id', v_transaction_id
        );

    EXCEPTION WHEN OTHERS THEN
        -- Rollback happens automatically
        RETURN json_build_object(
            'success', false,
            'message', 'Error processing sell order: ' || SQLERRM
        );
    END;
END;
$$;
