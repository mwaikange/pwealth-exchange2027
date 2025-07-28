-- Create helper functions for the simplified vesting system

-- Function to get all claimable slots for a user
CREATE OR REPLACE FUNCTION get_claimable_slots(p_user_uuid UUID)
RETURNS TABLE (
    id UUID,
    level INTEGER,
    slot_number INTEGER,
    amount NUMERIC,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pv.id,
        pv.level,
        pv.slot_number,
        pv.amount,
        pv.start_time,
        pv.end_time
    FROM pivot_vesting pv
    WHERE pv.user_uuid = p_user_uuid
    AND pv.status = 'unlocked';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim a vesting slot
CREATE OR REPLACE FUNCTION claim_vesting_slot(
    p_slot_id UUID,
    p_user_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    slot_amount NUMERIC;
    result JSON;
BEGIN
    -- Get the slot amount and verify it's claimable
    SELECT amount INTO slot_amount
    FROM pivot_vesting
    WHERE id = p_slot_id 
    AND user_uuid = p_user_uuid 
    AND status = 'unlocked';
    
    IF slot_amount IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Slot not found or not claimable');
    END IF;
    
    -- Update slot status to claimed
    UPDATE pivot_vesting
    SET status = 'claimed',
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_slot_id;
    
    -- Credit user's post-hold wallet
    INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
    VALUES (p_user_uuid, 'hold_wallet_post_hold', slot_amount, 'vesting_claim', NOW(), NOW())
    ON CONFLICT (user_uuid, wallet_type)
    DO UPDATE SET 
        shares = user_shares.shares + slot_amount,
        updated_at = NOW();
    
    result := json_build_object(
        'success', true,
        'message', 'Slot claimed successfully',
        'amount', slot_amount,
        'slot_id', p_slot_id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vest shares in a slot
CREATE OR REPLACE FUNCTION vest_shares_in_slot(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER,
    p_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
    hold_days INTEGER;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    result JSON;
BEGIN
    -- Determine hold period based on level
    CASE p_level
        WHEN 1 THEN hold_days := 5;   -- Retail
        WHEN 2 THEN hold_days := 30;  -- Small Business
        WHEN 3 THEN hold_days := 90;  -- Corporate
        ELSE hold_days := 5;          -- Default
    END CASE;
    
    start_time := NOW();
    end_time := start_time + (hold_days || ' days')::INTERVAL;
    
    -- Insert or update the vesting slot
    INSERT INTO pivot_vesting (
        user_uuid, level, slot_number, amount, status, 
        start_time, end_time, created_at, updated_at
    )
    VALUES (
        p_user_uuid, p_level, p_slot_number, p_amount, 'locked',
        start_time, end_time, NOW(), NOW()
    )
    ON CONFLICT (user_uuid, level, slot_number)
    DO UPDATE SET
        amount = p_amount,
        status = 'locked',
        start_time = start_time,
        end_time = end_time,
        updated_at = NOW();
    
    -- Deduct from user's pre-hold wallet
    UPDATE user_shares
    SET shares = shares - p_amount,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid 
    AND wallet_type = 'hold_wallet_pre_hold'
    AND shares >= p_amount;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient pre-hold balance');
    END IF;
    
    result := json_build_object(
        'success', true,
        'message', 'Shares vested successfully',
        'amount', p_amount,
        'level', p_level,
        'slot_number', p_slot_number,
        'end_time', end_time
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-unlock matured slots (can be called by CRON)
CREATE OR REPLACE FUNCTION unlock_matured_vesting_slots()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE pivot_vesting
    SET status = 'unlocked',
        updated_at = NOW()
    WHERE status = 'locked'
    AND end_time <= NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_claimable_slots(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_vesting_slot(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION vest_shares_in_slot(UUID, INTEGER, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_matured_vesting_slots() TO authenticated;

-- Create a unique constraint to prevent duplicate slots
ALTER TABLE pivot_vesting 
DROP CONSTRAINT IF EXISTS pivot_vesting_user_level_slot_unique;

ALTER TABLE pivot_vesting 
ADD CONSTRAINT pivot_vesting_user_level_slot_unique 
UNIQUE (user_uuid, level, slot_number);

RAISE NOTICE 'Vesting functions created successfully!';
