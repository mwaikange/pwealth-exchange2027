-- Create the new pivot vesting system
-- This replaces the old vesting_schedules with a more structured approach

-- Drop existing table if it exists
DROP TABLE IF EXISTS pivot_vesting CASCADE;

-- Create the pivot_vesting table
CREATE TABLE pivot_vesting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 6),
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
    shares NUMERIC(10,4) NOT NULL DEFAULT 0,
    vested_at TIMESTAMPTZ NULL,
    claimed_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique slot per user per level
    UNIQUE(user_uuid, slot_number, level)
);

-- Create indexes for performance
CREATE INDEX idx_pivot_vesting_user_uuid ON pivot_vesting(user_uuid);
CREATE INDEX idx_pivot_vesting_user_level ON pivot_vesting(user_uuid, level);
CREATE INDEX idx_pivot_vesting_vested_at ON pivot_vesting(vested_at) WHERE vested_at IS NOT NULL;
CREATE INDEX idx_pivot_vesting_claimed_at ON pivot_vesting(claimed_at) WHERE claimed_at IS NOT NULL;
CREATE INDEX idx_pivot_vesting_expires_at ON pivot_vesting(expires_at);

-- Enable RLS
ALTER TABLE pivot_vesting ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own vesting slots" ON pivot_vesting
    FOR SELECT USING (auth.uid() = user_uuid);

CREATE POLICY "Users can update their own vesting slots" ON pivot_vesting
    FOR UPDATE USING (auth.uid() = user_uuid);

-- Function to initialize vesting slots for a user
CREATE OR REPLACE FUNCTION initialize_user_vesting_slots(p_user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    slot_num INTEGER;
    level_num INTEGER;
    existing_count INTEGER;
BEGIN
    -- Check if user already has slots
    SELECT COUNT(*) INTO existing_count
    FROM pivot_vesting
    WHERE user_uuid = p_user_uuid;
    
    IF existing_count > 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User already has vesting slots initialized',
            'existing_slots', existing_count
        );
    END IF;
    
    -- Create 18 slots (6 slots × 3 levels)
    FOR level_num IN 1..3 LOOP
        FOR slot_num IN 1..6 LOOP
            INSERT INTO pivot_vesting (
                user_uuid,
                slot_number,
                level,
                shares,
                expires_at
            ) VALUES (
                p_user_uuid,
                slot_num,
                level_num,
                0, -- Start with 0 shares
                NOW() + INTERVAL '30 days'
            );
        END LOOP;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Vesting slots initialized successfully',
        'slots_created', 18
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Failed to initialize vesting slots: ' || SQLERRM,
        'error_code', 'INITIALIZATION_ERROR'
    );
END;
$$;

-- Function to add shares to a vesting slot
CREATE OR REPLACE FUNCTION add_shares_to_vesting_slot(
    p_user_uuid UUID,
    p_slot_number INTEGER,
    p_level INTEGER,
    p_shares NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate inputs
    IF p_shares <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Shares must be greater than 0',
            'error_code', 'INVALID_SHARES'
        );
    END IF;
    
    IF p_slot_number < 1 OR p_slot_number > 6 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Slot number must be between 1 and 6',
            'error_code', 'INVALID_SLOT'
        );
    END IF;
    
    IF p_level < 1 OR p_level > 3 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Level must be between 1 and 3',
            'error_code', 'INVALID_LEVEL'
        );
    END IF;
    
    -- Update the slot with additional shares
    UPDATE pivot_vesting
    SET 
        shares = shares + p_shares,
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '30 days' -- Reset expiry when adding shares
    WHERE user_uuid = p_user_uuid
    AND slot_number = p_slot_number
    AND level = p_level;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Vesting slot not found',
            'error_code', 'SLOT_NOT_FOUND'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Shares added to vesting slot successfully',
        'shares_added', p_shares
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Failed to add shares to vesting slot: ' || SQLERRM,
        'error_code', 'PROCESSING_ERROR'
    );
END;
$$;

-- Function to vest shares (mark as ready for claiming)
CREATE OR REPLACE FUNCTION vest_shares_in_slot(
    p_user_uuid UUID,
    p_slot_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    slot_shares NUMERIC;
BEGIN
    -- Check if slot exists and has shares
    SELECT shares INTO slot_shares
    FROM pivot_vesting
    WHERE id = p_slot_id
    AND user_uuid = p_user_uuid
    AND vested_at IS NULL
    AND claimed_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Vesting slot not found or already processed',
            'error_code', 'SLOT_NOT_FOUND'
        );
    END IF;
    
    IF slot_shares <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No shares to vest in this slot',
            'error_code', 'NO_SHARES'
        );
    END IF;
    
    -- Mark as vested
    UPDATE pivot_vesting
    SET 
        vested_at = NOW(),
        updated_at = NOW()
    WHERE id = p_slot_id
    AND user_uuid = p_user_uuid;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Shares vested successfully',
        'shares_vested', slot_shares
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Failed to vest shares: ' || SQLERRM,
        'error_code', 'PROCESSING_ERROR'
    );
END;
$$;

-- Function to claim vested shares
CREATE OR REPLACE FUNCTION claim_vested_shares_pivot(
    p_user_uuid UUID,
    p_slot_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    slot_shares NUMERIC;
    slot_record RECORD;
BEGIN
    -- Get slot details
    SELECT * INTO slot_record
    FROM pivot_vesting
    WHERE id = p_slot_id
    AND user_uuid = p_user_uuid
    AND vested_at IS NOT NULL
    AND claimed_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Vesting slot not found, not vested, or already claimed',
            'error_code', 'SLOT_NOT_AVAILABLE'
        );
    END IF;
    
    slot_shares := slot_record.shares;
    
    IF slot_shares <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No shares to claim in this slot',
            'error_code', 'NO_SHARES'
        );
    END IF;
    
    -- Mark as claimed
    UPDATE pivot_vesting
    SET 
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_slot_id
    AND user_uuid = p_user_uuid;
    
    -- Add shares to user's hold_post wallet
    INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at)
    VALUES (p_user_uuid, 'hold_post', slot_shares, NOW())
    ON CONFLICT (user_uuid, wallet_type)
    DO UPDATE SET 
        shares = user_shares.shares + EXCLUDED.shares,
        updated_at = NOW();
    
    -- Log the transaction
    INSERT INTO share_transactions (
        user_uuid,
        transaction_type,
        shares,
        total_amount,
        status,
        description,
        created_at
    ) VALUES (
        p_user_uuid,
        'vesting_claim',
        slot_shares,
        0, -- No monetary value for vesting claims
        'completed',
        'Claimed ' || slot_shares || ' vested shares from slot ' || slot_record.slot_number || ' level ' || slot_record.level,
        NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Vested shares claimed successfully',
        'shares_claimed', slot_shares
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Failed to claim vested shares: ' || SQLERRM,
        'error_code', 'PROCESSING_ERROR'
    );
END;
$$;

-- Function to get user's vesting summary
CREATE OR REPLACE FUNCTION get_user_vesting_summary(p_user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    summary_data JSON;
BEGIN
    SELECT json_build_object(
        'total_slots', COUNT(*),
        'active_slots', COUNT(*) FILTER (WHERE vested_at IS NULL AND claimed_at IS NULL),
        'vested_slots', COUNT(*) FILTER (WHERE vested_at IS NOT NULL AND claimed_at IS NULL),
        'claimed_slots', COUNT(*) FILTER (WHERE claimed_at IS NOT NULL),
        'total_shares', COALESCE(SUM(shares), 0),
        'vested_shares', COALESCE(SUM(shares) FILTER (WHERE vested_at IS NOT NULL AND claimed_at IS NULL), 0),
        'claimed_shares', COALESCE(SUM(shares) FILTER (WHERE claimed_at IS NOT NULL), 0),
        'by_level', json_object_agg(
            level,
            json_build_object(
                'slots', COUNT(*),
                'shares', COALESCE(SUM(shares), 0),
                'vested', COUNT(*) FILTER (WHERE vested_at IS NOT NULL AND claimed_at IS NULL),
                'claimed', COUNT(*) FILTER (WHERE claimed_at IS NOT NULL)
            )
        )
    ) INTO summary_data
    FROM pivot_vesting
    WHERE user_uuid = p_user_uuid
    GROUP BY user_uuid;
    
    RETURN COALESCE(summary_data, json_build_object(
        'total_slots', 0,
        'active_slots', 0,
        'vested_slots', 0,
        'claimed_slots', 0,
        'total_shares', 0,
        'vested_shares', 0,
        'claimed_shares', 0,
        'by_level', json_build_object()
    ));
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', 'Failed to get vesting summary: ' || SQLERRM
    );
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pivot_vesting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pivot_vesting_updated_at
    BEFORE UPDATE ON pivot_vesting
    FOR EACH ROW
    EXECUTE FUNCTION update_pivot_vesting_updated_at();

-- Grant necessary permissions
GRANT SELECT, UPDATE ON pivot_vesting TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_vesting_slots(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_shares_to_vesting_slot(UUID, INTEGER, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION vest_shares_in_slot(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_vested_shares_pivot(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_vesting_summary(UUID) TO authenticated;

-- Success message
SELECT 'Pivot vesting system created successfully!' as result;
