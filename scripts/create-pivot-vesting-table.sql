-- Create the pivot_vesting table with 18 slots per user (6 slots × 3 levels)
CREATE TABLE IF NOT EXISTS public.pivot_vesting (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 3),
    slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 6),
    shares_locked DECIMAL(20,4) DEFAULT 0 NOT NULL,
    shares_vested DECIMAL(20,4) DEFAULT 0 NOT NULL,
    shares_claimed DECIMAL(20,4) DEFAULT 0 NOT NULL,
    lock_date TIMESTAMPTZ,
    vest_date TIMESTAMPTZ,
    status TEXT DEFAULT 'empty' CHECK (status IN ('empty', 'locked', 'vesting', 'vested', 'claimed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure unique combination of user, level, and slot
    UNIQUE(user_uuid, level, slot_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_user_uuid ON public.pivot_vesting(user_uuid);
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_status ON public.pivot_vesting(status);
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_vest_date ON public.pivot_vesting(vest_date);
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_user_level ON public.pivot_vesting(user_uuid, level);

-- Enable RLS
ALTER TABLE public.pivot_vesting ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own vesting slots" ON public.pivot_vesting
    FOR SELECT USING (auth.uid() = user_uuid);

CREATE POLICY "Users can update their own vesting slots" ON public.pivot_vesting
    FOR UPDATE USING (auth.uid() = user_uuid);

-- Function to initialize vesting slots for a user
CREATE OR REPLACE FUNCTION public.initialize_user_vesting(p_user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Create 18 empty slots (6 slots × 3 levels) for the user if they don't exist
    INSERT INTO public.pivot_vesting (user_uuid, level, slot_number, status)
    SELECT 
        p_user_uuid,
        level_num,
        slot_num,
        'empty'
    FROM 
        generate_series(1, 3) AS level_num,
        generate_series(1, 6) AS slot_num
    ON CONFLICT (user_uuid, level, slot_number) DO NOTHING;
    
    RAISE NOTICE 'Initialized vesting slots for user %', p_user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add shares to vesting (finds next available slot)
CREATE OR REPLACE FUNCTION public.add_shares_to_vesting(
    p_user_uuid UUID,
    p_level INTEGER,
    p_shares DECIMAL(20,4)
)
RETURNS JSON AS $$
DECLARE
    v_slot_id UUID;
    v_vest_date TIMESTAMPTZ;
    v_result JSON;
BEGIN
    -- Validate inputs
    IF p_shares <= 0 THEN
        RAISE EXCEPTION 'Shares must be greater than 0';
    END IF;
    
    IF p_level < 1 OR p_level > 3 THEN
        RAISE EXCEPTION 'Level must be between 1 and 3';
    END IF;
    
    -- Calculate vest date based on level (30, 60, or 90 days)
    v_vest_date := NOW() + INTERVAL '30 days' * p_level;
    
    -- Find the next available slot for this level
    SELECT id INTO v_slot_id
    FROM public.pivot_vesting
    WHERE user_uuid = p_user_uuid 
        AND level = p_level 
        AND status = 'empty'
    ORDER BY slot_number
    LIMIT 1;
    
    -- Check if slot was found
    IF v_slot_id IS NULL THEN
        RAISE EXCEPTION 'No available vesting slots for level %', p_level;
    END IF;
    
    -- Update the slot with the locked shares
    UPDATE public.pivot_vesting
    SET 
        shares_locked = p_shares,
        lock_date = NOW(),
        vest_date = v_vest_date,
        status = 'locked',
        updated_at = NOW()
    WHERE id = v_slot_id;
    
    -- Return success result
    v_result := json_build_object(
        'success', true,
        'slot_id', v_slot_id,
        'level', p_level,
        'shares_locked', p_shares,
        'vest_date', v_vest_date,
        'message', format('Successfully locked %s shares in level %s vesting', p_shares, p_level)
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to add shares to vesting'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process vesting (moves locked shares to vested when time is up)
CREATE OR REPLACE FUNCTION public.process_vesting()
RETURNS JSON AS $$
DECLARE
    v_processed_count INTEGER := 0;
    v_slot RECORD;
BEGIN
    -- Find all locked slots that are ready to vest
    FOR v_slot IN 
        SELECT id, user_uuid, level, slot_number, shares_locked
        FROM public.pivot_vesting
        WHERE status = 'locked' 
            AND vest_date <= NOW()
    LOOP
        -- Move shares from locked to vested
        UPDATE public.pivot_vesting
        SET 
            shares_vested = shares_locked,
            status = 'vested',
            updated_at = NOW()
        WHERE id = v_slot.id;
        
        v_processed_count := v_processed_count + 1;
        
        RAISE NOTICE 'Vested % shares for user % (level %, slot %)', 
            v_slot.shares_locked, v_slot.user_uuid, v_slot.level, v_slot.slot_number;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'message', format('Processed %s vesting slots', v_processed_count)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to process vesting'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim vested shares
CREATE OR REPLACE FUNCTION public.claim_vested_shares(
    p_slot_id UUID,
    p_user_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    v_slot RECORD;
    v_claimable_shares DECIMAL(20,4);
    v_result JSON;
BEGIN
    -- Get the slot details
    SELECT * INTO v_slot
    FROM public.pivot_vesting
    WHERE id = p_slot_id 
        AND user_uuid = p_user_uuid
        AND status = 'vested';
    
    -- Check if slot exists and is vested
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vesting slot not found or not ready for claiming';
    END IF;
    
    -- Calculate claimable shares
    v_claimable_shares := v_slot.shares_vested - v_slot.shares_claimed;
    
    IF v_claimable_shares <= 0 THEN
        RAISE EXCEPTION 'No shares available to claim from this slot';
    END IF;
    
    -- Update the slot to mark as claimed
    UPDATE public.pivot_vesting
    SET 
        shares_claimed = shares_vested,
        status = 'claimed',
        updated_at = NOW()
    WHERE id = p_slot_id;
    
    -- Add shares to user's hold wallet (post-hold)
    INSERT INTO public.user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
    VALUES (p_user_uuid, 'hold_wallet_post_hold', v_claimable_shares, 'vesting_claim', NOW(), NOW())
    ON CONFLICT (user_uuid, wallet_type) 
    DO UPDATE SET 
        shares = user_shares.shares + v_claimable_shares,
        updated_at = NOW();
    
    -- Record the transaction
    INSERT INTO public.share_transactions (
        user_uuid, 
        transaction_type, 
        shares, 
        total_amount, 
        from_wallet, 
        to_wallet, 
        status, 
        description,
        created_at
    ) VALUES (
        p_user_uuid,
        'vesting_claim',
        v_claimable_shares,
        v_claimable_shares * 108.2, -- Current share price
        'vesting_slot',
        'hold_wallet_post_hold',
        'completed',
        format('Claimed %s vested shares from level %s slot %s', v_claimable_shares, v_slot.level, v_slot.slot_number),
        NOW()
    );
    
    -- Return success result
    v_result := json_build_object(
        'success', true,
        'shares_claimed', v_claimable_shares,
        'level', v_slot.level,
        'slot_number', v_slot.slot_number,
        'message', format('Successfully claimed %s shares', v_claimable_shares)
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to claim vested shares'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cron job to process vesting automatically (runs every hour)
-- Note: This requires the pg_cron extension to be enabled
-- SELECT cron.schedule('process-vesting', '0 * * * *', 'SELECT public.process_vesting();');

RAISE NOTICE 'Pivot vesting system created successfully!';
RAISE NOTICE 'Use initialize_user_vesting(user_uuid) to set up vesting slots for users';
RAISE NOTICE 'Use add_shares_to_vesting(user_uuid, level, shares) to lock shares in vesting';
RAISE NOTICE 'Use claim_vested_shares(slot_id, user_uuid) to claim vested shares';
