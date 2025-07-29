-- Fix the vest_shares function to match frontend expectations exactly
-- The frontend calls: supabase.rpc("vest_shares", { p_user_uuid, p_level, p_slot_number, p_shares })

-- Drop existing functions with any signature
DROP FUNCTION IF EXISTS vest_shares(UUID, INTEGER, INTEGER, NUMERIC);
DROP FUNCTION IF EXISTS vest_shares(p_user_uuid UUID, p_level INTEGER, p_slot_number INTEGER, p_shares NUMERIC);
DROP FUNCTION IF EXISTS public.vest_shares(p_level INTEGER, p_shares NUMERIC, p_slot_number INTEGER, p_user_uuid UUID);

-- Create the vest_shares function with the EXACT signature the frontend expects
CREATE OR REPLACE FUNCTION public.vest_shares(
    p_user_uuid UUID,
    p_level INTEGER, 
    p_slot_number INTEGER,
    p_shares NUMERIC
)
RETURNS JSON AS $$
DECLARE
    user_pre_hold_balance NUMERIC;
    hold_days INTEGER;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    existing_slot_id UUID;
    level_name TEXT;
    result JSON;
BEGIN
    -- Log the function call for debugging
    RAISE NOTICE 'vest_shares called with: user=%, level=%, slot=%, shares=%', 
        p_user_uuid, p_level, p_slot_number, p_shares;
    
    -- Validate inputs
    IF p_shares <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Amount must be greater than 0'
        );
    END IF;
    
    IF p_level NOT IN (1, 2, 3) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid level. Must be 1, 2, or 3'
        );
    END IF;
    
    IF p_slot_number < 1 OR p_slot_number > 6 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid slot number. Must be between 1 and 6'
        );
    END IF;
    
    -- Get level configuration
    CASE p_level
        WHEN 1 THEN 
            hold_days := 5;
            level_name := 'Retail';
        WHEN 2 THEN 
            hold_days := 30;
            level_name := 'Small Business';
        WHEN 3 THEN 
            hold_days := 90;
            level_name := 'Corporate';
        ELSE 
            hold_days := 5;
            level_name := 'Unknown';
    END CASE;
    
    -- Level-specific validation
    CASE p_level
        WHEN 1 THEN -- Retail: 1-50 shares
            IF p_shares < 1 OR p_shares > 50 THEN
                RETURN json_build_object(
                    'success', false,
                    'message', 'Retail level allows 1-50 shares per slot'
                );
            END IF;
        WHEN 2 THEN -- Small Business: 51-500 shares
            IF p_shares < 51 OR p_shares > 500 THEN
                RETURN json_build_object(
                    'success', false,
                    'message', 'Small Business level allows 51-500 shares per slot'
                );
            END IF;
        WHEN 3 THEN -- Corporate: 501+ shares
            IF p_shares < 501 THEN
                RETURN json_build_object(
                    'success', false,
                    'message', 'Corporate level requires minimum 501 shares per slot'
                );
            END IF;
    END CASE;
    
    -- Check user's pre-hold balance
    SELECT COALESCE(shares, 0) INTO user_pre_hold_balance
    FROM user_shares 
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_pre_hold';
    
    IF user_pre_hold_balance IS NULL THEN
        user_pre_hold_balance := 0;
    END IF;
    
    RAISE NOTICE 'User pre-hold balance: %', user_pre_hold_balance;
    
    IF user_pre_hold_balance < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient shares in Hold Wallet (Pre-Hold). Available: ' || user_pre_hold_balance || ', Required: ' || p_shares
        );
    END IF;
    
    -- Calculate vesting period
    start_time := NOW();
    end_time := start_time + (hold_days || ' days')::INTERVAL;
    
    -- Check if slot already exists and is not claimed
    SELECT id INTO existing_slot_id
    FROM pivot_vesting
    WHERE user_uuid = p_user_uuid 
    AND level = p_level 
    AND slot_number = p_slot_number
    AND status != 'claimed';
    
    IF existing_slot_id IS NOT NULL THEN
        -- Update existing slot
        UPDATE pivot_vesting
        SET amount = p_shares,
            status = 'locked',
            start_time = start_time,
            end_time = end_time,
            updated_at = NOW()
        WHERE id = existing_slot_id;
        
        RAISE NOTICE 'Updated existing slot % with % shares', existing_slot_id, p_shares;
    ELSE
        -- Create new slot
        INSERT INTO pivot_vesting (
            user_uuid, level, slot_number, amount, status,
            start_time, end_time, created_at, updated_at
        )
        VALUES (
            p_user_uuid, p_level, p_slot_number, p_shares, 'locked',
            start_time, end_time, NOW(), NOW()
        );
        
        RAISE NOTICE 'Created new vesting slot for level % slot %', p_level, p_slot_number;
    END IF;
    
    -- Deduct from user's pre-hold wallet
    UPDATE user_shares
    SET shares = shares - p_shares,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid 
    AND wallet_type = 'hold_wallet_pre_hold';
    
    IF NOT FOUND THEN
        -- This shouldn't happen if we checked balance correctly
        RAISE NOTICE 'Warning: Could not find pre-hold wallet to deduct from';
        RETURN json_build_object(
            'success', false,
            'message', 'Could not find pre-hold wallet'
        );
    END IF;
    
    -- Record transaction
    INSERT INTO share_transactions (
        user_uuid, transaction_type, shares, total_amount,
        from_wallet, to_wallet, status, description,
        created_at, updated_at
    )
    VALUES (
        p_user_uuid, 'vesting', p_shares, p_shares * 108.20, -- Current price
        'hold_wallet_pre_hold', 'vesting_locked', 'completed',
        'Vested ' || p_shares || ' shares in ' || level_name || ' Level Slot ' || p_slot_number || ' (' || hold_days || ' days)',
        NOW(), NOW()
    );
    
    RAISE NOTICE 'Vesting completed successfully for % shares', p_shares;
    
    -- Build success response
    SELECT json_build_object(
        'success', true,
        'message', 'Successfully vested ' || p_shares || ' shares in ' || level_name || ' Level Slot ' || p_slot_number,
        'data', json_build_object(
            'shares_vested', p_shares,
            'level', p_level,
            'level_name', level_name,
            'slot_number', p_slot_number,
            'hold_days', hold_days,
            'start_time', start_time,
            'end_time', end_time,
            'remaining_pre_hold', user_pre_hold_balance - p_shares
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in vest_shares: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'message', 'Error vesting shares: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the claim_shares function with exact signature expected
CREATE OR REPLACE FUNCTION public.claim_shares(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER
)
RETURNS JSON AS $$
DECLARE
    slot_record RECORD;
    level_name TEXT;
    result JSON;
BEGIN
    RAISE NOTICE 'claim_shares called with: user=%, level=%, slot=%', 
        p_user_uuid, p_level, p_slot_number;
    
    -- Get level name
    CASE p_level
        WHEN 1 THEN level_name := 'Retail';
        WHEN 2 THEN level_name := 'Small Business';
        WHEN 3 THEN level_name := 'Corporate';
        ELSE level_name := 'Unknown';
    END CASE;
    
    -- Get the slot record
    SELECT * INTO slot_record
    FROM pivot_vesting
    WHERE user_uuid = p_user_uuid 
    AND level = p_level 
    AND slot_number = p_slot_number
    AND status = 'locked';
    
    IF NOT FOUND THEN
        -- Check if slot exists but in different state
        SELECT * INTO slot_record
        FROM pivot_vesting
        WHERE user_uuid = p_user_uuid 
        AND level = p_level 
        AND slot_number = p_slot_number;
        
        IF FOUND THEN
            IF slot_record.status = 'claimed' THEN
                RETURN json_build_object(
                    'success', false,
                    'message', 'Shares have already been claimed from this slot'
                );
            END IF;
        END IF;
        
        RETURN json_build_object(
            'success', false,
            'message', 'No locked shares found in ' || level_name || ' Level Slot ' || p_slot_number
        );
    END IF;
    
    -- Check if vesting period is complete
    IF slot_record.end_time > NOW() THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Vesting period not complete. Available on: ' || slot_record.end_time::TEXT
        );
    END IF;
    
    -- Update slot status to claimed
    UPDATE pivot_vesting
    SET status = 'claimed',
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = slot_record.id;
    
    -- Credit user's post-hold wallet
    INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
    VALUES (p_user_uuid, 'hold_wallet_post_hold', slot_record.amount, NOW(), NOW())
    ON CONFLICT (user_uuid, wallet_type)
    DO UPDATE SET 
        shares = user_shares.shares + slot_record.amount,
        updated_at = NOW();
    
    -- Record transaction
    INSERT INTO share_transactions (
        user_uuid, transaction_type, shares, total_amount,
        from_wallet, to_wallet, status, description,
        created_at, updated_at
    )
    VALUES (
        p_user_uuid, 'claim', slot_record.amount, slot_record.amount * 108.20,
        'vesting_locked', 'hold_wallet_post_hold', 'completed',
        'Claimed ' || slot_record.amount || ' shares from ' || level_name || ' Level Slot ' || p_slot_number,
        NOW(), NOW()
    );
    
    RAISE NOTICE 'Claim completed successfully for % shares', slot_record.amount;
    
    SELECT json_build_object(
        'success', true,
        'message', 'Successfully claimed ' || slot_record.amount || ' shares from ' || level_name || ' Level Slot ' || p_slot_number,
        'data', json_build_object(
            'shares_claimed', slot_record.amount,
            'level', p_level,
            'level_name', level_name,
            'slot_number', p_slot_number,
            'claimed_at', NOW()
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in claim_shares: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'message', 'Error claiming shares: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.vest_shares(UUID, INTEGER, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_shares(UUID, INTEGER, INTEGER) TO authenticated;

-- Create a function to update vesting slot statuses based on time
CREATE OR REPLACE FUNCTION update_vesting_statuses()
RETURNS JSON AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update locked slots that have completed their vesting period
    UPDATE pivot_vesting
    SET status = 'claimable',
        updated_at = NOW()
    WHERE status = 'locked'
    AND end_time <= NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Updated % vesting slots to claimable status', updated_count;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Updated ' || updated_count || ' vesting slots to claimable status',
        'updated_count', updated_count
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permission
GRANT EXECUTE ON FUNCTION update_vesting_statuses() TO authenticated;

-- Test the functions with a sample user
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    vest_result JSON;
    claim_result JSON;
    update_result JSON;
BEGIN
    RAISE NOTICE 'Testing vest_shares and claim_shares functions...';
    
    -- Ensure test user has some pre-hold balance
    INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
    VALUES (test_user_id, 'hold_wallet_pre_hold', 100.0, NOW(), NOW())
    ON CONFLICT (user_uuid, wallet_type)
    DO UPDATE SET shares = 100.0, updated_at = NOW();
    
    RAISE NOTICE 'Set test user pre-hold balance to 100 shares';
    
    -- Test vesting (Retail level, 25 shares)
    SELECT public.vest_shares(test_user_id, 1, 1, 25.0) INTO vest_result;
    RAISE NOTICE 'Vest result: %', vest_result;
    
    -- Update vesting statuses
    SELECT update_vesting_statuses() INTO update_result;
    RAISE NOTICE 'Update result: %', update_result;
    
    -- Test claiming (will likely fail because not enough time passed)
    SELECT public.claim_shares(test_user_id, 1, 1) INTO claim_result;
    RAISE NOTICE 'Claim result: %', claim_result;
    
    RAISE NOTICE 'Function tests completed successfully';
END;
$$;

-- Show function signatures for verification
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN ('vest_shares', 'claim_shares')
ORDER BY p.proname;
