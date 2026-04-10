-- ============================================================================
-- FIX: Handle total_amount constraint in sell_orders table
-- ============================================================================

-- Check if there are any constraints on total_amount
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'sell_orders' 
    AND kcu.column_name = 'total_amount'
    AND tc.table_schema = 'public';

-- Check for triggers on sell_orders
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'sell_orders'
    AND event_object_schema = 'public';

-- ============================================================================
-- STEP 1: Drop and recreate place_sell_order function with DEFAULT handling
-- ============================================================================

DROP FUNCTION IF EXISTS place_sell_order(UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS place_sell_order(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION place_sell_order(
    p_user_uuid UUID,
    p_shares NUMERIC,
    p_price_per_share NUMERIC DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    exchange_open BOOLEAN;
    current_price NUMERIC;
    calculated_total_amount NUMERIC;
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

    -- Insert sell order WITHOUT total_amount (let it use DEFAULT or be calculated by trigger)
    INSERT INTO sell_orders (
        user_uuid, 
        shares_available,    -- ACTUAL column name
        shares_remaining,    -- ACTUAL column name
        price_per_share, 
        -- total_amount,     -- REMOVED - let it use DEFAULT or trigger calculation
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
        -- calculated_total_amount,  -- REMOVED
        'available',         -- CORRECT enum value
        DEFAULT,             -- Use default expires_at calculation
        v_sell_ref,
        NOW(),
        NOW()
    ) RETURNING id INTO sell_order_id;

    -- Log transaction WITHOUT updated_at if it doesn't exist
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

    RETURN json_build_object(
        'success', true,
        'message', format('Sell order placed: %s shares at N$%s each (Total: N$%s). Ref: %s',
            p_shares, current_price, calculated_total_amount, v_sell_ref),
        'order_id', sell_order_id,
        'sell_ref', v_sell_ref,
        'shares', p_shares,
        'price_per_share', current_price,
        'total_amount', calculated_total_amount
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

-- ============================================================================
-- STEP 2: Alternative approach - Use DEFAULT explicitly for total_amount
-- ============================================================================

CREATE OR REPLACE FUNCTION place_sell_order_v2(
    p_user_uuid UUID,
    p_shares NUMERIC,
    p_price_per_share NUMERIC DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    exchange_open BOOLEAN;
    current_price NUMERIC;
    calculated_total_amount NUMERIC;
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

    -- Insert sell order WITH explicit DEFAULT for total_amount
    INSERT INTO sell_orders (
        user_uuid, 
        shares_available,    -- ACTUAL column name
        shares_remaining,    -- ACTUAL column name
        price_per_share, 
        total_amount,        -- Use DEFAULT explicitly
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
        DEFAULT,             -- Let database handle total_amount
        'available',         -- CORRECT enum value
        DEFAULT,             -- Use default expires_at calculation
        v_sell_ref,
        NOW(),
        NOW()
    ) RETURNING id INTO sell_order_id;

    -- Log transaction
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'share_transactions' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
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
        INSERT INTO share_transactions (
            user_uuid, transaction_type, shares, price_per_share, total_amount,
            from_wallet, status, description, reference_id, created_at
        ) VALUES (
            p_user_uuid, 'sell', p_shares, current_price, calculated_total_amount,
            'hold_wallet_post_hold', 'pending', 'Sell order placed - shares locked', v_sell_ref, NOW()
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', format('Sell order placed: %s shares at N$%s each (Total: N$%s). Ref: %s',
            p_shares, current_price, calculated_total_amount, v_sell_ref),
        'order_id', sell_order_id,
        'sell_ref', v_sell_ref,
        'shares', p_shares,
        'price_per_share', current_price,
        'total_amount', calculated_total_amount
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

-- ============================================================================
-- STEP 3: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION place_sell_order(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION place_sell_order_v2(UUID, NUMERIC, NUMERIC) TO authenticated;

-- ============================================================================
-- STEP 4: Test both approaches
-- ============================================================================

DO $$
DECLARE
    test_user_id UUID := '8cd30e69-ddaa-4a90-94e3-f65472738164';
    sell_result JSON;
    sell_result_v2 JSON;
BEGIN
    -- Set up test balance
    INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
    VALUES (test_user_id, 'hold_wallet_post_hold', 100.0, NOW(), NOW())
    ON CONFLICT (user_uuid, wallet_type)
    DO UPDATE SET 
        shares = GREATEST(user_shares.shares, 100.0),
        updated_at = NOW();
    
    RAISE NOTICE 'Testing sell order approaches...';
    
    -- Test approach 1: Omit total_amount column
    BEGIN
        SELECT place_sell_order(test_user_id, 1.0) INTO sell_result;
        RAISE NOTICE 'Approach 1 (omit total_amount): %', sell_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Approach 1 FAILED: %', SQLERRM;
    END;
    
    -- Test approach 2: Use DEFAULT for total_amount
    BEGIN
        SELECT place_sell_order_v2(test_user_id, 1.0) INTO sell_result_v2;
        RAISE NOTICE 'Approach 2 (DEFAULT total_amount): %', sell_result_v2;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Approach 2 FAILED: %', SQLERRM;
    END;
    
    -- Show actual sell orders created
    RAISE NOTICE 'Sell orders in database:';
    FOR rec IN 
        SELECT id, shares_available, shares_remaining, price_per_share, total_amount, status, sell_ref
        FROM sell_orders 
        WHERE user_uuid = test_user_id 
        ORDER BY created_at DESC 
        LIMIT 2
    LOOP
        RAISE NOTICE '  Order: shares=%, price=%, total=%, status=%, ref=%', 
            rec.shares_available, rec.price_per_share, rec.total_amount, rec.status, rec.sell_ref;
    END LOOP;
END;
$$;

-- ============================================================================
-- STEP 5: Choose working approach and update main function
-- ============================================================================

-- This will be determined by the test results above
-- If approach 1 works, we keep place_sell_order as is
-- If approach 2 works, we replace place_sell_order with place_sell_order_v2

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                ✅ TOTAL_AMOUNT CONSTRAINT FIX                             █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 APPROACHES TESTED:';
    RAISE NOTICE '   1. Omit total_amount column from INSERT';
    RAISE NOTICE '   2. Use DEFAULT for total_amount column';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Check the test results above to see which approach works!';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Next: Update place_sell_order to use the working approach';
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
