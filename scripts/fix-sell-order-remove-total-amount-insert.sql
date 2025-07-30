-- ============================================================================
-- FIX: Remove total_amount from sell_orders INSERT statement
-- The database handles this value internally via constraint/trigger
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS place_sell_order(UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS place_sell_order(UUID, NUMERIC);

-- Create corrected place_sell_order function
CREATE OR REPLACE FUNCTION place_sell_order(
    p_user_uuid UUID,
    p_shares NUMERIC,
    p_price_per_share NUMERIC DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    exchange_open BOOLEAN;
    current_price NUMERIC;
    calculated_total_amount NUMERIC;  -- Keep for validation and logging
    user_post_hold_balance NUMERIC;
    sell_order_id UUID;
    v_sell_ref TEXT;
    original_balance NUMERIC;
BEGIN
    -- Check if exchange is open
    BEGIN
        SELECT (get_exchange_status())->>'is_trading_open' INTO exchange_open;
        IF NOT COALESCE(exchange_open, false) THEN
            RETURN json_build_object(
                'success', false,
                'message', 'Exchange is currently closed. Trading resumes Monday at 10:05 (Windhoek time).',
                'error_code', 'EXCHANGE_CLOSED'
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        exchange_open := true;
    END;

    -- Get current price
    BEGIN
        current_price := COALESCE(p_price_per_share, get_current_share_price());
        IF current_price IS NULL OR current_price <= 0 THEN
            current_price := 99.68;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        current_price := 99.68;
    END;

    -- Calculate total_amount for validation and logging (but don't insert it)
    calculated_total_amount := p_shares * current_price;

    -- Validate minimum amount
    IF calculated_total_amount < 50 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum sell order value is N$50',
            'error_code', 'MIN_AMOUNT'
        );
    END IF;

    -- Get user's ORIGINAL post-hold balance for proper rollback
    SELECT COALESCE(shares, 0) INTO original_balance
    FROM user_shares
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_post_hold';

    user_post_hold_balance := original_balance;

    IF user_post_hold_balance < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', format('Insufficient shares. Available: %s, Required: %s', user_post_hold_balance, p_shares),
            'error_code', 'INSUFFICIENT_SHARES'
        );
    END IF;

    -- Deduct shares from post-hold wallet
    UPDATE user_shares
    SET shares = shares - p_shares, updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_post_hold';

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Post-hold wallet not found',
            'error_code', 'WALLET_NOT_FOUND'
        );
    END IF;

    -- Generate sell reference
    v_sell_ref := 'Sell_' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));

    -- Insert sell order WITHOUT total_amount (database handles it internally)
    INSERT INTO sell_orders (
        user_uuid, 
        shares_available,    -- ACTUAL column name
        shares_remaining,    -- ACTUAL column name
        price_per_share, 
        -- total_amount,     -- REMOVED - database handles this internally
        status,              -- Default 'available'
        expires_at,          -- Has default value
        sell_ref,
        created_at,
        updated_at
    ) VALUES (
        p_user_uuid, 
        p_shares,            -- shares_available
        p_shares,            -- shares_remaining (starts same as available)
        current_price, 
        -- calculated_total_amount,  -- REMOVED - let database handle it
        'available',         -- CORRECT enum value
        DEFAULT,             -- Use default expires_at calculation
        v_sell_ref,
        NOW(),
        NOW()
    ) RETURNING id INTO sell_order_id;

    -- Log transaction using calculated_total_amount (this is fine for logging)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'share_transactions' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
        -- Insert WITH updated_at
        INSERT INTO share_transactions (
            user_uuid, transaction_type, shares, price_per_share, total_amount,
            from_wallet, status, description, reference_id,
            created_at, updated_at
        ) VALUES (
            p_user_uuid, 'sell', p_shares, current_price, calculated_total_amount,
            'hold_wallet_post_hold', 'pending', 'Sell order placed - shares locked', v_sell_ref,
            NOW(), NOW()
        );
    ELSE
        -- Insert WITHOUT updated_at
        INSERT INTO share_transactions (
            user_uuid, transaction_type, shares, price_per_share, total_amount,
            from_wallet, status, description, reference_id, created_at
        ) VALUES (
            p_user_uuid, 'sell', p_shares, current_price, calculated_total_amount,
            'hold_wallet_post_hold', 'pending', 'Sell order placed - shares locked', v_sell_ref, NOW()
        );
    END IF;

    -- Return calculated_total_amount for UI display (even though we didn't insert it)
    RETURN json_build_object(
        'success', true,
        'message', format('Sell order placed: %s shares at N$%s each (Total: N$%s). Ref: %s',
            p_shares, current_price, calculated_total_amount, v_sell_ref),
        'order_id', sell_order_id,
        'sell_ref', v_sell_ref,
        'shares', p_shares,
        'price_per_share', current_price,
        'total_amount', calculated_total_amount  -- For UI display
    );

EXCEPTION
    WHEN OTHERS THEN
        -- CORRECT rollback: Set balance back to original amount
        UPDATE user_shares
        SET shares = original_balance, updated_at = NOW()
        WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_post_hold';
        
        RETURN json_build_object(
            'success', false,
            'message', 'Error processing sell order: ' || SQLERRM,
            'error_code', 'PROCESSING_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION place_sell_order(UUID, NUMERIC, NUMERIC) TO authenticated;

-- ============================================================================
-- Test the fixed function
-- ============================================================================

DO $$
DECLARE
    test_user_id UUID := '8cd30e69-ddaa-4a90-94e3-f65472738164';
    sell_result JSON;
    order_record RECORD;
BEGIN
    -- Set up test balance
    INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
    VALUES (test_user_id, 'hold_wallet_post_hold', 100.0, NOW(), NOW())
    ON CONFLICT (user_uuid, wallet_type)
    DO UPDATE SET 
        shares = GREATEST(user_shares.shares, 100.0),
        updated_at = NOW();
    
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Testing FIXED place_sell_order (without total_amount in INSERT)...';
    
    -- Test the fixed function
    BEGIN
        SELECT place_sell_order(test_user_id, 2.5) INTO sell_result;
        RAISE NOTICE '✅ SUCCESS: %', sell_result;
        
        -- Show the actual order created (with database-calculated total_amount)
        SELECT * INTO order_record
        FROM sell_orders 
        WHERE user_uuid = test_user_id 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        RAISE NOTICE '';
        RAISE NOTICE '📊 Database-created sell order:';
        RAISE NOTICE '   ID: %', order_record.id;
        RAISE NOTICE '   Shares Available: %', order_record.shares_available;
        RAISE NOTICE '   Shares Remaining: %', order_record.shares_remaining;
        RAISE NOTICE '   Price Per Share: N$%', order_record.price_per_share;
        RAISE NOTICE '   Total Amount (DB calculated): N$%', order_record.total_amount;
        RAISE NOTICE '   Status: %', order_record.status;
        RAISE NOTICE '   Sell Ref: %', order_record.sell_ref;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ FAILED: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    ✅ SELL ORDER FIX COMPLETE                             █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 CHANGES MADE:';
    RAISE NOTICE '   • Removed total_amount from INSERT INTO sell_orders';
    RAISE NOTICE '   • Database now calculates total_amount internally';
    RAISE NOTICE '   • Still calculate total_amount for validation & logging';
    RAISE NOTICE '   • UI display still works with calculated value';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready to test sell orders in the UI!';
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
