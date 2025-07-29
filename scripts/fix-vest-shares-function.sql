-- Fix the vest_shares function to match frontend expectations
-- This creates the correct function signature that the vesting context expects

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS vest_shares(UUID, INTEGER, INTEGER, NUMERIC);
DROP FUNCTION IF EXISTS vest_shares(p_user_uuid UUID, p_level INTEGER, p_slot_number INTEGER, p_shares NUMERIC);

-- Create the correct vest_shares function that matches frontend call
CREATE OR REPLACE FUNCTION vest_shares(
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
    result JSON;
BEGIN
    RAISE NOTICE 'Vesting % shares for user % in level % slot %', p_shares, p_user_uuid, p_level, p_slot_number;
    
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
    
    -- Check user's pre-hold balance
    SELECT COALESCE(shares, 0) INTO user_pre_hold_balance
    FROM user_shares 
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_pre_hold';
    
    IF user_pre_hold_balance < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient shares in Hold Wallet (Pre-Hold). Available: ' || user_pre_hold_balance
        );
    END IF;
    
    -- Determine hold period based on level
    CASE p_level
        WHEN 1 THEN hold_days := 5;   -- Retail
        WHEN 2 THEN hold_days := 30;  -- Small Business
        WHEN 3 THEN hold_days := 90;  -- Corporate
        ELSE hold_days := 5;          -- Default
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
    
    start_time := NOW();
    end_time := start_time + (hold_days || ' days')::INTERVAL;
    
    -- Check if slot already exists
    SELECT id INTO existing_slot_id
    FROM pivot_vesting
    WHERE user_uuid = p_user_uuid 
    AND level = p_level 
    AND slot_number = p_slot_number;
    
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
        -- Create pre-hold wallet if it doesn't exist (shouldn't happen, but safety check)
        INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
        VALUES (p_user_uuid, 'hold_wallet_pre_hold', -p_shares, NOW(), NOW());
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
        'Vested ' || p_shares || ' shares in Level ' || p_level || ' Slot ' || p_slot_number || ' (' || hold_days || ' days)',
        NOW(), NOW()
    );
    
    RAISE NOTICE 'Vesting completed successfully';
    
    SELECT json_build_object(
        'success', true,
        'message', 'Successfully vested ' || p_shares || ' shares',
        'data', json_build_object(
            'shares_vested', p_shares,
            'level', p_level,
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

-- Create the claim_shares function as well
CREATE OR REPLACE FUNCTION claim_shares(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER
)
RETURNS JSON AS $$
DECLARE
    slot_record RECORD;
    result JSON;
BEGIN
    RAISE NOTICE 'Claiming shares for user % level % slot %', p_user_uuid, p_level, p_slot_number;
    
    -- Get the slot record
    SELECT * INTO slot_record
    FROM pivot_vesting
    WHERE user_uuid = p_user_uuid 
    AND level = p_level 
    AND slot_number = p_slot_number
    AND status IN ('unlocked', 'claimable');
    
    IF NOT FOUND THEN
        -- Check if slot exists but not ready
        SELECT * INTO slot_record
        FROM pivot_vesting
        WHERE user_uuid = p_user_uuid 
        AND level = p_level 
        AND slot_number = p_slot_number;
        
        IF FOUND THEN
            IF slot_record.status = 'locked' THEN
                RETURN json_build_object(
                    'success', false,
                    'message', 'Shares are still locked. Available on: ' || slot_record.end_time
                );
            ELSIF slot_record.status = 'claimed' THEN
                RETURN json_build_object(
                    'success', false,
                    'message', 'Shares have already been claimed'
                );
            END IF;
        END IF;
        
        RETURN json_build_object(
            'success', false,
            'message', 'No claimable shares found in this slot'
        );
    END IF;
    
    -- Check if vesting period is complete
    IF slot_record.end_time > NOW() THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Vesting period not complete. Available on: ' || slot_record.end_time
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
        'Claimed ' || slot_record.amount || ' shares from Level ' || p_level || ' Slot ' || p_slot_number,
        NOW(), NOW()
    );
    
    RAISE NOTICE 'Claim completed successfully';
    
    SELECT json_build_object(
        'success', true,
        'message', 'Successfully claimed ' || slot_record.amount || ' shares',
        'data', json_build_object(
            'shares_claimed', slot_record.amount,
            'level', p_level,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION vest_shares(UUID, INTEGER, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_shares(UUID, INTEGER, INTEGER) TO authenticated;

-- Test the functions
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    vest_result JSON;
    claim_result JSON;
BEGIN
    RAISE NOTICE 'Testing vest_shares and claim_shares functions...';
    
    -- Ensure test user has some pre-hold balance
    INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
    VALUES (test_user_id, 'hold_wallet_pre_hold', 100.0, NOW(), NOW())
    ON CONFLICT (user_uuid, wallet_type)
    DO UPDATE SET shares = 100.0, updated_at = NOW();
    
    -- Test vesting
    SELECT vest_shares(test_user_id, 1, 1, 25.0) INTO vest_result;
    RAISE NOTICE 'Vest result: %', vest_result;
    
    -- Test claiming (will fail because not enough time passed)
    SELECT claim_shares(test_user_id, 1, 1) INTO claim_result;
    RAISE NOTICE 'Claim result: %', claim_result;
    
    RAISE NOTICE 'Function tests completed';
END;
$$;
