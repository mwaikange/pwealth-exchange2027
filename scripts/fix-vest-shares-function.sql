-- Fix Vest Shares Function to Match Frontend Expectations
-- This script creates the correct vest_shares and claim_shares functions

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS vest_shares(UUID, INTEGER, INTEGER, NUMERIC);
DROP FUNCTION IF EXISTS claim_shares(UUID, INTEGER, INTEGER);

-- Create the vest_shares function with correct signature matching frontend call
CREATE OR REPLACE FUNCTION vest_shares(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER, 
    p_shares NUMERIC
)
RETURNS JSON AS $$
DECLARE
    user_pre_hold_balance NUMERIC;
    existing_slot_id UUID;
    vesting_days INTEGER;
    level_config JSON;
    min_shares INTEGER;
    max_shares INTEGER;
BEGIN
    -- Validate level and get configuration
    CASE p_level
        WHEN 1 THEN 
            vesting_days := 5;
            min_shares := 1;
            max_shares := 50;
        WHEN 2 THEN 
            vesting_days := 30;
            min_shares := 51;
            max_shares := 500;
        WHEN 3 THEN 
            vesting_days := 90;
            min_shares := 501;
            max_shares := 999999;
        ELSE
            RETURN json_build_object(
                'success', false,
                'message', 'Invalid level. Must be 1 (Retail), 2 (Small Business), or 3 (Corporate)'
            );
    END CASE;
    
    -- Validate slot number (1-6)
    IF p_slot_number < 1 OR p_slot_number > 6 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid slot number. Must be between 1 and 6'
        );
    END IF;
    
    -- Validate share amount
    IF p_shares < min_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum ' || min_shares || ' shares required for this level'
        );
    END IF;
    
    IF p_shares > max_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Maximum ' || max_shares || ' shares allowed for this level'
        );
    END IF;
    
    -- Check user's pre-hold balance
    SELECT COALESCE(shares, 0) 
    INTO user_pre_hold_balance
    FROM user_shares 
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_pre';
    
    IF user_pre_hold_balance < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient shares in Hold Wallet (Pre-Hold). Available: ' || user_pre_hold_balance
        );
    END IF;
    
    -- Check if slot is already occupied
    SELECT id INTO existing_slot_id
    FROM pivot_vesting 
    WHERE user_uuid = p_user_uuid 
    AND level = p_level 
    AND slot_number = p_slot_number
    AND status IN ('vest', 'locked', 'claimable');
    
    IF existing_slot_id IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Slot ' || p_slot_number || ' is already occupied'
        );
    END IF;
    
    -- Deduct shares from pre-hold wallet
    UPDATE user_shares 
    SET shares = shares - p_shares,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_pre';
    
    -- Insert or update vesting slot
    INSERT INTO pivot_vesting (
        user_uuid, level, slot_number, amount, status,
        start_time, end_time, created_at, updated_at
    ) VALUES (
        p_user_uuid, p_level, p_slot_number, p_shares, 'locked',
        NOW(), NOW() + (vesting_days || ' days')::INTERVAL,
        NOW(), NOW()
    )
    ON CONFLICT (user_uuid, level, slot_number) 
    DO UPDATE SET
        amount = p_shares,
        status = 'locked',
        start_time = NOW(),
        end_time = NOW() + (vesting_days || ' days')::INTERVAL,
        updated_at = NOW();
    
    -- Record transaction
    INSERT INTO share_transactions (
        user_uuid, transaction_type, shares, total_amount,
        from_wallet, to_wallet, status, description
    ) VALUES (
        p_user_uuid, 'vest', p_shares, p_shares * 108.20,
        'hold_pre', 'vesting_locked', 'completed',
        'Vested ' || p_shares || ' shares in Level ' || p_level || ' Slot ' || p_slot_number || ' (' || vesting_days || ' days)'
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully vested ' || p_shares || ' shares',
        'vesting_details', json_build_object(
            'level', p_level,
            'slot_number', p_slot_number,
            'shares_vested', p_shares,
            'vesting_days', vesting_days,
            'start_time', NOW(),
            'end_time', NOW() + (vesting_days || ' days')::INTERVAL
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error vesting shares: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Create the claim_shares function
CREATE OR REPLACE FUNCTION claim_shares(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER
)
RETURNS JSON AS $$
DECLARE
    vesting_slot RECORD;
    shares_to_claim NUMERIC;
BEGIN
    -- Find the vesting slot
    SELECT * INTO vesting_slot
    FROM pivot_vesting 
    WHERE user_uuid = p_user_uuid 
    AND level = p_level 
    AND slot_number = p_slot_number
    AND status IN ('claimable', 'locked');
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No claimable shares found in this slot'
        );
    END IF;
    
    -- Check if vesting period is complete
    IF vesting_slot.status = 'locked' AND vesting_slot.end_time > NOW() THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Vesting period not yet complete. Available at: ' || vesting_slot.end_time
        );
    END IF;
    
    shares_to_claim := vesting_slot.amount;
    
    -- Add shares to post-hold wallet
    INSERT INTO user_shares (user_uuid, wallet_type, shares, updated_at)
    VALUES (p_user_uuid, 'hold_post', shares_to_claim, NOW())
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
        from_wallet, to_wallet, status, description
    ) VALUES (
        p_user_uuid, 'claim', shares_to_claim, shares_to_claim * 108.20,
        'vesting_locked', 'hold_post', 'completed',
        'Claimed ' || shares_to_claim || ' shares from Level ' || p_level || ' Slot ' || p_slot_number
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully claimed ' || shares_to_claim || ' shares',
        'claim_details', json_build_object(
            'level', p_level,
            'slot_number', p_slot_number,
            'shares_claimed', shares_to_claim,
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
$$ LANGUAGE plpgsql;

-- Function to update vesting statuses (call this periodically)
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
        'message', 'Updated ' || updated_count || ' vesting slots to claimable',
        'updated_count', updated_count,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Test function to verify the functions work
CREATE OR REPLACE FUNCTION test_vesting_functions()
RETURNS JSON AS $$
DECLARE
    test_user_id UUID;
    vest_result JSON;
    claim_result JSON;
    status_result JSON;
BEGIN
    -- Create a test user ID
    test_user_id := 'test-user-' || extract(epoch from now())::text;
    
    -- Ensure test user has some pre-hold shares
    INSERT INTO user_shares (user_uuid, wallet_type, shares, updated_at)
    VALUES (test_user_id, 'hold_pre', 100, NOW())
    ON CONFLICT (user_uuid, wallet_type)
    DO UPDATE SET shares = 100, updated_at = NOW();
    
    -- Test vesting
    SELECT vest_shares(test_user_id, 1, 1, 10) INTO vest_result;
    
    -- Test status update
    SELECT update_vesting_statuses() INTO status_result;
    
    -- Test claiming (this will fail since vesting period isn't complete, but that's expected)
    SELECT claim_shares(test_user_id, 1, 1) INTO claim_result;
    
    RETURN json_build_object(
        'test_user_id', test_user_id,
        'vest_result', vest_result,
        'status_update_result', status_result,
        'claim_result', claim_result,
        'functions_exist', json_build_object(
            'vest_shares', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'vest_shares') > 0,
            'claim_shares', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'claim_shares') > 0,
            'update_vesting_statuses', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'update_vesting_statuses') > 0
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT test_vesting_functions();

-- Show current function signatures
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('vest_shares', 'claim_shares', 'update_vesting_statuses')
ORDER BY routine_name;
