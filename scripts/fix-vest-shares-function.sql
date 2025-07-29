-- Fix Vest Shares Function - Complete Implementation
-- This script fixes all vesting-related functions and database issues

-- First, ensure the pivot_vesting table has the correct structure
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivot_vesting' AND column_name = 'ui_archived') THEN
        ALTER TABLE pivot_vesting ADD COLUMN ui_archived BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivot_vesting' AND column_name = 'ui_archived_at') THEN
        ALTER TABLE pivot_vesting ADD COLUMN ui_archived_at TIMESTAMPTZ;
    END IF;
END $$;

-- Ensure user_shares table has correct wallet types
DO $$
BEGIN
    -- Update wallet type constraints to match what the frontend expects
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_shares_wallet_type_check') THEN
        ALTER TABLE user_shares DROP CONSTRAINT user_shares_wallet_type_check;
    END IF;
    
    ALTER TABLE user_shares ADD CONSTRAINT user_shares_wallet_type_check 
    CHECK (wallet_type IN ('buy_wallet', 'hold_wallet_pre_hold', 'hold_wallet_post_hold', 'cashout_wallet'));
END $$;

-- Drop existing vest_shares functions to avoid conflicts
DROP FUNCTION IF EXISTS vest_shares(UUID, NUMERIC, INTEGER);
DROP FUNCTION IF EXISTS vest_shares(UUID, INTEGER, INTEGER, NUMERIC);
DROP FUNCTION IF EXISTS claim_shares(UUID, INTEGER, INTEGER);

-- Create the correct vest_shares function matching frontend expectations
CREATE OR REPLACE FUNCTION vest_shares(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER,
    p_shares NUMERIC
)
RETURNS JSON AS $$
DECLARE
    user_pre_hold_balance NUMERIC;
    existing_slot_record RECORD;
    vesting_days INTEGER;
    level_name TEXT;
    min_shares INTEGER;
    max_shares INTEGER;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
BEGIN
    -- Validate and get level configuration
    CASE p_level
        WHEN 1 THEN 
            vesting_days := 5;
            level_name := 'Retail';
            min_shares := 1;
            max_shares := 50;
        WHEN 2 THEN 
            vesting_days := 30;
            level_name := 'Small Business';
            min_shares := 51;
            max_shares := 500;
        WHEN 3 THEN 
            vesting_days := 90;
            level_name := 'Corporate';
            min_shares := 501;
            max_shares := 999999;
        ELSE
            RETURN json_build_object(
                'success', false,
                'message', 'Invalid level. Must be 1 (Retail), 2 (Small Business), or 3 (Corporate)'
            );
    END CASE;
    
    -- Validate inputs
    IF p_slot_number < 1 OR p_slot_number > 6 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid slot number. Must be between 1 and 6'
        );
    END IF;
    
    IF p_shares < min_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', level_name || ' level requires minimum ' || min_shares || ' shares per slot'
        );
    END IF;
    
    IF p_shares > max_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', level_name || ' level allows maximum ' || max_shares || ' shares per slot'
        );
    END IF;
    
    -- Check user's pre-hold balance
    SELECT COALESCE(shares, 0) INTO user_pre_hold_balance
    FROM user_shares 
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_pre_hold';
    
    IF user_pre_hold_balance < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient shares in Hold Wallet (Pre-Hold). Available: ' || COALESCE(user_pre_hold_balance, 0) || ', Required: ' || p_shares
        );
    END IF;
    
    -- Check if slot is already occupied (not claimed)
    SELECT * INTO existing_slot_record
    FROM pivot_vesting 
    WHERE user_uuid = p_user_uuid 
    AND level = p_level 
    AND slot_number = p_slot_number
    AND status != 'claimed';
    
    IF existing_slot_record.id IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', level_name || ' Level Slot ' || p_slot_number || ' is already occupied with ' || existing_slot_record.amount || ' shares'
        );
    END IF;
    
    -- Calculate vesting period
    start_time := NOW();
    end_time := start_time + (vesting_days || ' days')::INTERVAL;
    
    -- Deduct shares from pre-hold wallet
    UPDATE user_shares 
    SET shares = shares - p_shares,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_pre_hold';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Could not update pre-hold wallet. Please try again.'
        );
    END IF;
    
    -- Create vesting slot
    INSERT INTO pivot_vesting (
        user_uuid, level, slot_number, amount, status,
        start_time, end_time, created_at, updated_at
    ) VALUES (
        p_user_uuid, p_level, p_slot_number, p_shares, 'locked',
        start_time, end_time, NOW(), NOW()
    );
    
    -- Record transaction
    INSERT INTO share_transactions (
        user_uuid, transaction_type, shares, total_amount,
        from_wallet, to_wallet, status, description,
        created_at, updated_at
    ) VALUES (
        p_user_uuid, 'vesting', p_shares, p_shares * 108.20,
        'hold_wallet_pre_hold', 'vesting_locked', 'completed',
        'Vested ' || p_shares || ' shares in ' || level_name || ' Level Slot ' || p_slot_number || ' (' || vesting_days || ' days)',
        NOW(), NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully vested ' || p_shares || ' shares in ' || level_name || ' Level Slot ' || p_slot_number,
        'data', json_build_object(
            'shares_vested', p_shares,
            'level', p_level,
            'level_name', level_name,
            'slot_number', p_slot_number,
            'vesting_days', vesting_days,
            'start_time', start_time,
            'end_time', end_time,
            'remaining_pre_hold', user_pre_hold_balance - p_shares
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error vesting shares: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the claim_shares function
CREATE OR REPLACE FUNCTION claim_shares(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER
)
RETURNS JSON AS $$
DECLARE
    vesting_slot RECORD;
    level_name TEXT;
    shares_to_claim NUMERIC;
BEGIN
    -- Get level name
    CASE p_level
        WHEN 1 THEN level_name := 'Retail';
        WHEN 2 THEN level_name := 'Small Business';
        WHEN 3 THEN level_name := 'Corporate';
        ELSE level_name := 'Unknown';
    END CASE;
    
    -- Find the vesting slot
    SELECT * INTO vesting_slot
    FROM pivot_vesting 
    WHERE user_uuid = p_user_uuid 
    AND level = p_level 
    AND slot_number = p_slot_number
    AND status = 'locked';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No claimable shares found in ' || level_name || ' Level Slot ' || p_slot_number
        );
    END IF;
    
    -- Check if vesting period is complete
    IF vesting_slot.end_time > NOW() THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Vesting period not yet complete. Available at: ' || vesting_slot.end_time::TEXT
        );
    END IF;
    
    shares_to_claim := vesting_slot.amount;
    
    -- Add shares to post-hold wallet
    INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
    VALUES (p_user_uuid, 'hold_wallet_post_hold', shares_to_claim, NOW(), NOW())
    ON CONFLICT (user_uuid, wallet_type)
    DO UPDATE SET 
        shares = user_shares.shares + shares_to_claim,
        updated_at = NOW();
    
    -- Update vesting slot status
    UPDATE pivot_vesting 
    SET status = 'claimed',
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = vesting_slot.id;
    
    -- Record transaction
    INSERT INTO share_transactions (
        user_uuid, transaction_type, shares, total_amount,
        from_wallet, to_wallet, status, description,
        created_at, updated_at
    ) VALUES (
        p_user_uuid, 'claim', shares_to_claim, shares_to_claim * 108.20,
        'vesting_locked', 'hold_wallet_post_hold', 'completed',
        'Claimed ' || shares_to_claim || ' shares from ' || level_name || ' Level Slot ' || p_slot_number,
        NOW(), NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully claimed ' || shares_to_claim || ' shares from ' || level_name || ' Level Slot ' || p_slot_number,
        'data', json_build_object(
            'shares_claimed', shares_to_claim,
            'level', p_level,
            'level_name', level_name,
            'slot_number', p_slot_number,
            'claimed_at', NOW()
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error claiming shares: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update vesting statuses
CREATE OR REPLACE FUNCTION update_vesting_statuses()
RETURNS JSON AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update locked slots that have completed their vesting period
    UPDATE pivot_vesting 
    SET status = 'claimable',
        updated_at = NOW()
    WHERE status = 'locked' 
    AND end_time <= NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Updated ' || updated_count || ' vesting slots to claimable status',
        'updated_count', updated_count,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION vest_shares(UUID, INTEGER, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_shares(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_vesting_statuses() TO authenticated;

-- Test with existing user (use the UUID you provided)
DO $$
DECLARE
    existing_user_id UUID := '8cd30e69-ddaa-4a90-94e3-f65472738164';
    vest_result JSON;
    claim_result JSON;
    status_result JSON;
BEGIN
    -- Ensure test user has some pre-hold balance
    INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
    VALUES (existing_user_id, 'hold_wallet_pre_hold', 100.0, NOW(), NOW())
    ON CONFLICT (user_uuid, wallet_type)
    DO UPDATE SET shares = GREATEST(user_shares.shares, 100.0), updated_at = NOW();
    
    RAISE NOTICE 'Test user % now has pre-hold balance', existing_user_id;
    
    -- Test vesting (Retail level, 25 shares)
    SELECT vest_shares(existing_user_id, 1, 1, 25.0) INTO vest_result;
    RAISE NOTICE 'Vest result: %', vest_result;
    
    -- Update vesting statuses
    SELECT update_vesting_statuses() INTO status_result;
    RAISE NOTICE 'Status update result: %', status_result;
    
    -- Test claiming (will fail because not enough time passed, but that's expected)
    SELECT claim_shares(existing_user_id, 1, 1) INTO claim_result;
    RAISE NOTICE 'Claim result: %', claim_result;
    
    RAISE NOTICE 'Vesting function tests completed';
END;
$$;

-- Show function signatures for verification
SELECT 
    routine_name,
    routine_type,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE r.routine_name IN ('vest_shares', 'claim_shares', 'update_vesting_statuses')
AND r.routine_schema = 'public'
ORDER BY r.routine_name;
