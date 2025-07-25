-- Fix slot number indexing from 0-based to 1-based in pivot_vesting table
-- This ensures consistency between database and frontend display

-- Step 1: Update existing slot_number values from 0-based to 1-based
UPDATE public.pivot_vesting 
SET slot_number = slot_number + 1 
WHERE slot_number IS NOT NULL AND slot_number >= 0;

-- Step 2: Handle any NULL slot_number values by assigning proper 1-6 numbers
DO $$
DECLARE
    user_record RECORD;
    level_num INTEGER;
    slot_counter INTEGER;
    null_slot RECORD;
BEGIN
    -- Find users with NULL slot numbers and fix them
    FOR user_record IN 
        SELECT DISTINCT user_uuid 
        FROM public.pivot_vesting 
        WHERE slot_number IS NULL
    LOOP
        -- For each level, assign slot numbers 1-6 to NULL entries
        FOR level_num IN 1..3 LOOP
            slot_counter := 1;
            
            -- Get all NULL slots for this user/level and assign numbers
            FOR null_slot IN 
                SELECT id 
                FROM public.pivot_vesting 
                WHERE user_uuid = user_record.user_uuid 
                    AND level = level_num 
                    AND slot_number IS NULL
                ORDER BY created_at
            LOOP
                UPDATE public.pivot_vesting 
                SET slot_number = slot_counter 
                WHERE id = null_slot.id;
                
                slot_counter := slot_counter + 1;
                
                -- Don't exceed 6 slots per level
                IF slot_counter > 6 THEN
                    EXIT;
                END IF;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Fixed NULL slot numbers for user: %', user_record.user_uuid;
    END LOOP;
END $$;

-- Step 3: Ensure we have proper 1-6 slots for all users
DO $$
DECLARE
    user_record RECORD;
    level_num INTEGER;
    slot_num INTEGER;
    existing_slots INTEGER;
BEGIN
    -- Get all users who should have complete slot sets
    FOR user_record IN 
        SELECT DISTINCT user_uuid 
        FROM public.pivot_vesting
    LOOP
        -- For each level, ensure we have slots 1-6
        FOR level_num IN 1..3 LOOP
            -- Check how many slots exist for this user/level
            SELECT COUNT(*) INTO existing_slots
            FROM public.pivot_vesting
            WHERE user_uuid = user_record.user_uuid 
                AND level = level_num;
            
            -- If we have fewer than 6 slots, create the missing ones
            IF existing_slots < 6 THEN
                FOR slot_num IN 1..6 LOOP
                    -- Insert slot if it doesn't exist
                    INSERT INTO public.pivot_vesting (
                        user_uuid, 
                        level, 
                        slot_number, 
                        amount, 
                        status, 
                        created_at, 
                        updated_at
                    ) VALUES (
                        user_record.user_uuid,
                        level_num,
                        slot_num,
                        0,
                        'vest',
                        NOW(),
                        NOW()
                    ) ON CONFLICT (user_uuid, level, slot_number) DO NOTHING;
                END LOOP;
                
                RAISE NOTICE 'Ensured complete slot set for user % level %', user_record.user_uuid, level_num;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Step 4: Update the unique constraint to reflect 1-based indexing
ALTER TABLE public.pivot_vesting 
DROP CONSTRAINT IF EXISTS pivot_vesting_user_uuid_level_slot_number_key;

ALTER TABLE public.pivot_vesting 
ADD CONSTRAINT pivot_vesting_user_uuid_level_slot_number_key 
UNIQUE (user_uuid, level, slot_number);

-- Step 5: Update the slot_number constraint to ensure 1-6 range
ALTER TABLE public.pivot_vesting 
DROP CONSTRAINT IF EXISTS pivot_vesting_slot_number_check;

ALTER TABLE public.pivot_vesting 
ADD CONSTRAINT pivot_vesting_slot_number_check 
CHECK (slot_number >= 1 AND slot_number <= 6);

-- Step 6: Update the vest_shares_in_slot function to use 1-based indexing
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
    
    -- Updated to use 1-based slot numbers (1-6)
    IF p_slot_number < 1 OR p_slot_number > 6 THEN
        RAISE EXCEPTION 'Slot number must be between 1 and 6';
    END IF;
    
    -- Get the slot ID and check if it's available
    SELECT id INTO v_slot_id
    FROM public.pivot_vesting
    WHERE user_uuid = p_user_uuid 
        AND level = p_level 
        AND slot_number = p_slot_number
        AND status = 'vest';
    
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
        status = 'locked',
        start_time = NOW(),
        end_time = v_end_time,
        updated_at = NOW()
    WHERE id = v_slot_id;
    
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

-- Step 7: Update the initialize_user_vesting_slots function to use 1-based indexing
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
    
    -- Create 18 slots (6 slots × 3 levels) for the user with 1-based slot numbers
    INSERT INTO public.pivot_vesting (user_uuid, level, slot_number, status)
    SELECT 
        p_user_uuid,
        level_num,
        slot_num,
        'vest'
    FROM 
        generate_series(1, 3) AS level_num,
        generate_series(1, 6) AS slot_num  -- Changed to 1-6 instead of 0-5
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

-- Step 8: Verification - Show current slot distribution
DO $$
DECLARE
    total_slots INTEGER;
    total_users INTEGER;
    slot_distribution RECORD;
BEGIN
    SELECT COUNT(*) INTO total_slots FROM public.pivot_vesting;
    SELECT COUNT(DISTINCT user_uuid) INTO total_users FROM public.pivot_vesting;
    
    RAISE NOTICE '=== SLOT INDEXING MIGRATION COMPLETED ===';
    RAISE NOTICE 'Total vesting slots: %', total_slots;
    RAISE NOTICE 'Total users with slots: %', total_users;
    RAISE NOTICE 'Expected slots per user: 18 (6 slots × 3 levels)';
    
    -- Show slot number distribution
    RAISE NOTICE '=== SLOT NUMBER DISTRIBUTION ===';
    FOR slot_distribution IN 
        SELECT 
            level,
            slot_number,
            COUNT(*) as slot_count
        FROM public.pivot_vesting 
        GROUP BY level, slot_number 
        ORDER BY level, slot_number
    LOOP
        RAISE NOTICE 'Level % Slot %: % users', 
            slot_distribution.level, 
            slot_distribution.slot_number, 
            slot_distribution.slot_count;
    END LOOP;
    
    -- Check for any invalid slot numbers
    SELECT COUNT(*) INTO total_slots
    FROM public.pivot_vesting 
    WHERE slot_number < 1 OR slot_number > 6;
    
    IF total_slots > 0 THEN
        RAISE WARNING 'Found % slots with invalid slot numbers (should be 1-6)', total_slots;
    ELSE
        RAISE NOTICE '✅ All slot numbers are valid (1-6 range)';
    END IF;
END $$;

-- Final success message
RAISE NOTICE '🎯 Slot indexing successfully updated to 1-based!';
RAISE NOTICE 'All slots now use slot_number 1-6 instead of 0-5';
RAISE NOTICE 'Database and frontend are now consistent';
