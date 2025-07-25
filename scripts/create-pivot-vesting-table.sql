-- Create the proper pivot_vesting table with correct structure
-- This implements the 18-slot vesting system (6 slots × 3 levels)

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.pivot_vesting CASCADE;

-- Create the pivot_vesting table with correct column structure
CREATE TABLE public.pivot_vesting (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 3),
    slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 6),
    amount DECIMAL(20,4) DEFAULT 0 NOT NULL, -- Fractional shares with 4 decimal precision
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'vesting', 'ready_to_claim', 'claimed')),
    start_time TIMESTAMPTZ NULL, -- When vesting started
    end_time TIMESTAMPTZ NULL, -- When it becomes claimable
    claimed_at TIMESTAMPTZ NULL, -- When it was claimed
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure unique combination of user, level, and slot
    UNIQUE(user_uuid, level, slot_number)
);

-- Create indexes for performance
CREATE INDEX idx_pivot_vesting_user_uuid ON public.pivot_vesting(user_uuid);
CREATE INDEX idx_pivot_vesting_status ON public.pivot_vesting(status);
CREATE INDEX idx_pivot_vesting_end_time ON public.pivot_vesting(end_time) WHERE end_time IS NOT NULL;
CREATE INDEX idx_pivot_vesting_user_level ON public.pivot_vesting(user_uuid, level);
CREATE INDEX idx_pivot_vesting_user_status ON public.pivot_vesting(user_uuid, status);

-- Enable RLS
ALTER TABLE public.pivot_vesting ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own vesting slots" ON public.pivot_vesting
    FOR SELECT USING (auth.uid() = user_uuid);

CREATE POLICY "Users can update their own vesting slots" ON public.pivot_vesting
    FOR UPDATE USING (auth.uid() = user_uuid);

-- Function to initialize 18 vesting slots for a user (6 slots × 3 levels)
CREATE OR REPLACE FUNCTION public.initialize_user_vesting_slots(p_user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    existing_count INTEGER;
    inserted_count INTEGER := 0;
BEGIN
    -- Check if user already has slots
    SELECT COUNT(*) INTO existing_count
    FROM public.pivot_vesting
    WHERE user_uuid = p_user_uuid;
    
    IF existing_count >= 18 THEN
        RETURN json_build_object(
            'success', true,
            'message', 'User already has vesting slots initialized',
            'existing_slots', existing_count
        );
    END IF;
    
    -- Create 18 slots (6 slots × 3 levels) for the user
    INSERT INTO public.pivot_vesting (user_uuid, level, slot_number, status)
    SELECT 
        p_user_uuid,
        level_num,
        slot_num,
        'available'
    FROM 
        generate_series(1, 3) AS level_num,
        generate_series(1, 6) AS slot_num
    ON CONFLICT (user_uuid, level, slot_number) DO NOTHING;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Vesting slots initialized successfully',
        'slots_created', inserted_count,
        'existing_slots', existing_count
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to initialize vesting slots'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vest shares in a specific slot
CREATE OR REPLACE FUNCTION public.vest_shares_in_slot(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER,
    p_amount DECIMAL(20,4)
)
RETURNS JSON AS $$
DECLARE
    v_slot_id UUID;
    v_end_time TIMESTAMPTZ;
    v_days INTEGER;
BEGIN
    -- Validate inputs
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than 0';
    END IF;
    
    IF p_level < 1 OR p_level > 3 THEN
        RAISE EXCEPTION 'Level must be between 1 and 3';
    END IF;
    
    IF p_slot_number < 1 OR p_slot_number > 6 THEN
        RAISE EXCEPTION 'Slot number must be between 1 and 6';
    END IF;
    
    -- Get the slot ID and check if it's available
    SELECT id INTO v_slot_id
    FROM public.pivot_vesting
    WHERE user_uuid = p_user_uuid 
        AND level = p_level 
        AND slot_number = p_slot_number
        AND status = 'available';
    
    IF v_slot_id IS NULL THEN
        RAISE EXCEPTION 'Slot % at level % is not available for vesting', p_slot_number, p_level;
    END IF;
    
    -- Calculate end time based on level
    CASE p_level
        WHEN 1 THEN v_days := 5;   -- Retail: 5 days
        WHEN 2 THEN v_days := 30;  -- Small Business: 30 days
        WHEN 3 THEN v_days := 90;  -- Corporate: 90 days
    END CASE;
    
    v_end_time := NOW() + (v_days || ' days')::INTERVAL;
    
    -- Update the slot with vesting information
    UPDATE public.pivot_vesting
    SET 
        amount = p_amount,
        status = 'vesting',
        start_time = NOW(),
        end_time = v_end_time,
        updated_at = NOW()
    WHERE id = v_slot_id;
    
    -- Move shares from pre-hold to vesting (locked state)
    -- This would typically be handled by the application layer
    -- but we can log the transaction here
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
        'vesting_lock',
        p_amount,
        p_amount * 108.20, -- Current share price
        'hold_wallet_pre_hold',
        'vesting_locked',
        'completed',
        format('Locked %s shares in level %s slot %s for %s days', p_amount, p_level, p_slot_number, v_days),
        NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'slot_id', v_slot_id,
        'level', p_level,
        'slot_number', p_slot_number,
        'amount', p_amount,
        'start_time', NOW(),
        'end_time', v_end_time,
        'days', v_days,
        'message', format('Successfully vested %s shares in level %s slot %s', p_amount, p_level, p_slot_number)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to vest shares'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically process vesting (transition vesting -> ready_to_claim)
CREATE OR REPLACE FUNCTION public.process_vesting_maturity()
RETURNS JSON AS $$
DECLARE
    v_processed_count INTEGER := 0;
    v_slot RECORD;
BEGIN
    -- Find all vesting slots that are ready to mature
    FOR v_slot IN 
        SELECT id, user_uuid, level, slot_number, amount
        FROM public.pivot_vesting
        WHERE status = 'vesting' 
            AND end_time <= NOW()
    LOOP
        -- Update status to ready_to_claim
        UPDATE public.pivot_vesting
        SET 
            status = 'ready_to_claim',
            updated_at = NOW()
        WHERE id = v_slot.id;
        
        v_processed_count := v_processed_count + 1;
        
        RAISE NOTICE 'Matured vesting for user % (level %, slot %, amount %)', 
            v_slot.user_uuid, v_slot.level, v_slot.slot_number, v_slot.amount;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'message', format('Processed %s vesting slots to ready_to_claim', v_processed_count)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to process vesting maturity'
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
    v_claimable_amount DECIMAL(20,4);
BEGIN
    -- Get the slot details
    SELECT * INTO v_slot
    FROM public.pivot_vesting
    WHERE id = p_slot_id 
        AND user_uuid = p_user_uuid
        AND status = 'ready_to_claim';
    
    -- Check if slot exists and is ready for claiming
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vesting slot not found or not ready for claiming';
    END IF;
    
    v_claimable_amount := v_slot.amount;
    
    IF v_claimable_amount <= 0 THEN
        RAISE EXCEPTION 'No shares available to claim from this slot';
    END IF;
    
    -- Update the slot to mark as claimed
    UPDATE public.pivot_vesting
    SET 
        status = 'claimed',
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_slot_id;
    
    -- Add shares to user's hold wallet (post-hold)
    INSERT INTO public.user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
    VALUES (p_user_uuid, 'hold_wallet_post_hold', v_claimable_amount, 'vesting_claim', NOW(), NOW())
    ON CONFLICT (user_uuid, wallet_type) 
    DO UPDATE SET 
        shares = user_shares.shares + v_claimable_amount,
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
        v_claimable_amount,
        v_claimable_amount * 108.20, -- Current share price
        'vesting_locked',
        'hold_wallet_post_hold',
        'completed',
        format('Claimed %s vested shares from level %s slot %s', v_claimable_amount, v_slot.level, v_slot.slot_number),
        NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'amount_claimed', v_claimable_amount,
        'level', v_slot.level,
        'slot_number', v_slot.slot_number,
        'message', format('Successfully claimed %s shares', v_claimable_amount)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to claim vested shares'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's vesting summary
CREATE OR REPLACE FUNCTION public.get_user_vesting_summary(p_user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    summary_data JSON;
BEGIN
    SELECT json_build_object(
        'total_slots', COUNT(*),
        'available_slots', COUNT(*) FILTER (WHERE status = 'available'),
        'vesting_slots', COUNT(*) FILTER (WHERE status = 'vesting'),
        'ready_to_claim_slots', COUNT(*) FILTER (WHERE status = 'ready_to_claim'),
        'claimed_slots', COUNT(*) FILTER (WHERE status = 'claimed'),
        'total_amount', COALESCE(SUM(amount), 0),
        'vesting_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'vesting'), 0),
        'ready_to_claim_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'ready_to_claim'), 0),
        'claimed_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'claimed'), 0),
        'by_level', json_object_agg(
            level,
            json_build_object(
                'slots', COUNT(*),
                'available', COUNT(*) FILTER (WHERE status = 'available'),
                'vesting', COUNT(*) FILTER (WHERE status = 'vesting'),
                'ready_to_claim', COUNT(*) FILTER (WHERE status = 'ready_to_claim'),
                'claimed', COUNT(*) FILTER (WHERE status = 'claimed'),
                'total_amount', COALESCE(SUM(amount), 0)
            )
        )
    ) INTO summary_data
    FROM public.pivot_vesting
    WHERE user_uuid = p_user_uuid
    GROUP BY user_uuid;
    
    RETURN COALESCE(summary_data, json_build_object(
        'total_slots', 0,
        'available_slots', 0,
        'vesting_slots', 0,
        'ready_to_claim_slots', 0,
        'claimed_slots', 0,
        'total_amount', 0,
        'vesting_amount', 0,
        'ready_to_claim_amount', 0,
        'claimed_amount', 0,
        'by_level', json_build_object()
    ));
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', 'Failed to get vesting summary: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pivot_vesting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pivot_vesting_updated_at
    BEFORE UPDATE ON public.pivot_vesting
    FOR EACH ROW
    EXECUTE FUNCTION update_pivot_vesting_updated_at();

-- Create a cron job to process vesting maturity automatically (runs every hour)
-- Note: This requires the pg_cron extension to be enabled
-- SELECT cron.schedule('process-vesting-maturity', '0 * * * *', 'SELECT public.process_vesting_maturity();');

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.pivot_vesting TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_user_vesting_slots(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vest_shares_in_slot(UUID, INTEGER, INTEGER, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_vesting_maturity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_vested_shares(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_vesting_summary(UUID) TO authenticated;

-- Success message
RAISE NOTICE 'Pivot vesting system created successfully!';
RAISE NOTICE 'Features:';
RAISE NOTICE '- 18 slots per user (6 slots × 3 levels)';
RAISE NOTICE '- Fractional shares with 4 decimal precision';
RAISE NOTICE '- Automatic status transitions';
RAISE NOTICE '- Level-based vesting periods: Retail(5d), Small Business(30d), Corporate(90d)';
RAISE NOTICE 'Usage:';
RAISE NOTICE '- initialize_user_vesting_slots(user_uuid) to set up slots';
RAISE NOTICE '- vest_shares_in_slot(user_uuid, level, slot_number, amount) to vest shares';
RAISE NOTICE '- claim_vested_shares(slot_id, user_uuid) to claim matured shares';
RAISE NOTICE '- process_vesting_maturity() to auto-transition vesting -> ready_to_claim';
