-- Fix vesting functions with proper error handling and wallet management

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS vest_shares(uuid, integer, integer, numeric);
DROP FUNCTION IF EXISTS vest_shares(uuid, integer, integer);
DROP FUNCTION IF EXISTS claim_shares(uuid, integer, integer);

-- Create the vest_shares function with proper signature
CREATE OR REPLACE FUNCTION vest_shares(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER,
    p_shares NUMERIC
) RETURNS JSON AS $$
DECLARE
    v_pre_hold_shares NUMERIC := 0;
    v_existing_vesting NUMERIC := 0;
    v_result JSON;
BEGIN
    -- Validate inputs
    IF p_shares <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid share amount'
        );
    END IF;

    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_uuid) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;

    -- Get current pre-hold wallet balance
    SELECT COALESCE(shares, 0) INTO v_pre_hold_shares
    FROM user_shares 
    WHERE user_uuid = p_user_uuid 
    AND wallet_type = 'hold_wallet_pre_hold';

    -- Check if user has enough shares
    IF v_pre_hold_shares < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', format('Insufficient shares. Available: %s, Requested: %s', v_pre_hold_shares, p_shares)
        );
    END IF;

    -- Check existing vesting for this slot
    SELECT COALESCE(shares_vested, 0) INTO v_existing_vesting
    FROM user_vesting_pivot
    WHERE user_uuid = p_user_uuid 
    AND level = p_level 
    AND slot_number = p_slot_number;

    -- If slot already has vesting, return error
    IF v_existing_vesting > 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', format('Slot %s already has %s shares vested', p_slot_number, v_existing_vesting)
        );
    END IF;

    -- Start transaction
    BEGIN
        -- Deduct shares from pre-hold wallet
        UPDATE user_shares 
        SET shares = shares - p_shares,
            updated_at = NOW()
        WHERE user_uuid = p_user_uuid 
        AND wallet_type = 'hold_wallet_pre_hold';

        -- Insert or update vesting record
        INSERT INTO user_vesting_pivot (
            user_uuid, 
            level, 
            slot_number, 
            shares_vested, 
            vesting_start_date, 
            status,
            created_at,
            updated_at
        ) VALUES (
            p_user_uuid,
            p_level,
            p_slot_number,
            p_shares,
            CURRENT_DATE,
            'active',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_uuid, level, slot_number) 
        DO UPDATE SET
            shares_vested = p_shares,
            vesting_start_date = CURRENT_DATE,
            status = 'active',
            updated_at = NOW();

        -- Return success
        RETURN json_build_object(
            'success', true,
            'message', format('Successfully vested %s shares in Level %s, Slot %s', p_shares, p_level, p_slot_number),
            'shares_vested', p_shares,
            'level', p_level,
            'slot_number', p_slot_number,
            'remaining_pre_hold', v_pre_hold_shares - p_shares
        );

    EXCEPTION WHEN OTHERS THEN
        -- Rollback and return error
        RETURN json_build_object(
            'success', false,
            'message', format('Database error: %s', SQLERRM)
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the claim_shares function
CREATE OR REPLACE FUNCTION claim_shares(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER
) RETURNS JSON AS $$
DECLARE
    v_vesting_record RECORD;
    v_days_vested INTEGER;
    v_claimable_shares NUMERIC := 0;
    v_total_days INTEGER := 30; -- 30 days vesting period
BEGIN
    -- Get vesting record
    SELECT * INTO v_vesting_record
    FROM user_vesting_pivot
    WHERE user_uuid = p_user_uuid 
    AND level = p_level 
    AND slot_number = p_slot_number
    AND status = 'active';

    -- Check if vesting record exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No active vesting found for this slot'
        );
    END IF;

    -- Calculate days vested
    v_days_vested := EXTRACT(DAY FROM (CURRENT_DATE - v_vesting_record.vesting_start_date));
    
    -- Calculate claimable shares (linear vesting over 30 days)
    IF v_days_vested >= v_total_days THEN
        v_claimable_shares := v_vesting_record.shares_vested - COALESCE(v_vesting_record.shares_claimed, 0);
    ELSE
        v_claimable_shares := (v_vesting_record.shares_vested * v_days_vested / v_total_days) - COALESCE(v_vesting_record.shares_claimed, 0);
    END IF;

    -- Check if there are shares to claim
    IF v_claimable_shares <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No shares available to claim at this time'
        );
    END IF;

    -- Start transaction
    BEGIN
        -- Update vesting record
        UPDATE user_vesting_pivot
        SET shares_claimed = COALESCE(shares_claimed, 0) + v_claimable_shares,
            last_claim_date = CURRENT_DATE,
            updated_at = NOW(),
            status = CASE 
                WHEN (COALESCE(shares_claimed, 0) + v_claimable_shares) >= shares_vested THEN 'completed'
                ELSE 'active'
            END
        WHERE user_uuid = p_user_uuid 
        AND level = p_level 
        AND slot_number = p_slot_number;

        -- Add shares to post-hold wallet
        INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
        VALUES (p_user_uuid, 'hold_wallet_post_hold', v_claimable_shares, NOW(), NOW())
        ON CONFLICT (user_uuid, wallet_type)
        DO UPDATE SET 
            shares = user_shares.shares + v_claimable_shares,
            updated_at = NOW();

        -- Return success
        RETURN json_build_object(
            'success', true,
            'message', format('Successfully claimed %s shares', v_claimable_shares),
            'shares_claimed', v_claimable_shares,
            'total_claimed', COALESCE(v_vesting_record.shares_claimed, 0) + v_claimable_shares,
            'total_vested', v_vesting_record.shares_vested,
            'days_vested', v_days_vested,
            'status', CASE 
                WHEN (COALESCE(v_vesting_record.shares_claimed, 0) + v_claimable_shares) >= v_vesting_record.shares_vested THEN 'completed'
                ELSE 'active'
            END
        );

    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', format('Database error: %s', SQLERRM)
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION vest_shares(UUID, INTEGER, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_shares(UUID, INTEGER, INTEGER) TO authenticated;

-- Test the functions with existing user
DO $$
DECLARE
    test_user_id UUID := '8cd30e69-ddaa-4a90-94e3-f65472738164';
    test_result JSON;
BEGIN
    -- Ensure user has some pre-hold shares for testing
    INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
    VALUES (test_user_id, 'hold_wallet_pre_hold', 100.0, NOW(), NOW())
    ON CONFLICT (user_uuid, wallet_type)
    DO UPDATE SET 
        shares = GREATEST(user_shares.shares, 100.0),
        updated_at = NOW();

    -- Test vest_shares function
    SELECT vest_shares(test_user_id, 1, 1, 10.0) INTO test_result;
    RAISE NOTICE 'Vest shares test result: %', test_result;

    -- Test claim_shares function
    SELECT claim_shares(test_user_id, 1, 1) INTO test_result;
    RAISE NOTICE 'Claim shares test result: %', test_result;
END $$;

-- Show final function list
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN ('vest_shares', 'claim_shares')
ORDER BY p.proname, p.oid;
