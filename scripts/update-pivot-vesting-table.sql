-- Update existing pivot_vesting table to match new structure
-- This script safely migrates the existing table to the new format

-- First, let's check what columns currently exist
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pivot_vesting' AND table_schema = 'public') THEN
        RAISE NOTICE 'pivot_vesting table does not exist. Please run the create script first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Starting pivot_vesting table migration...';
END $$;

-- Step 1: Add new columns if they don't exist
ALTER TABLE public.pivot_vesting 
ADD COLUMN IF NOT EXISTS level INTEGER,
ADD COLUMN IF NOT EXISTS slot_number INTEGER,
ADD COLUMN IF NOT EXISTS amount DECIMAL(20,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available',
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Step 2: Update constraints for new columns
DO $$
BEGIN
    -- Add level constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'pivot_vesting_level_check' 
                   AND table_name = 'pivot_vesting') THEN
        ALTER TABLE public.pivot_vesting 
        ADD CONSTRAINT pivot_vesting_level_check CHECK (level >= 1 AND level <= 3);
    END IF;
    
    -- Add slot_number constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'pivot_vesting_slot_number_check' 
                   AND table_name = 'pivot_vesting') THEN
        ALTER TABLE public.pivot_vesting 
        ADD CONSTRAINT pivot_vesting_slot_number_check CHECK (slot_number >= 1 AND slot_number <= 6);
    END IF;
    
    -- Add status constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'pivot_vesting_status_check' 
                   AND table_name = 'pivot_vesting') THEN
        ALTER TABLE public.pivot_vesting 
        ADD CONSTRAINT pivot_vesting_status_check CHECK (status IN ('available', 'vesting', 'ready_to_claim', 'claimed'));
    END IF;
END $$;

-- Step 3: Drop old columns that are no longer needed
DO $$
DECLARE
    col_name TEXT;
    columns_to_drop TEXT[] := ARRAY[
        'slot_position', 
        'progress', 
        'shares_locked', 
        'shares_vested', 
        'shares_claimed',
        'lock_date',
        'vest_date'
    ];
BEGIN
    FOREACH col_name IN ARRAY columns_to_drop
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pivot_vesting' 
                   AND column_name = col_name 
                   AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.pivot_vesting DROP COLUMN IF EXISTS %I', col_name);
            RAISE NOTICE 'Dropped column: %', col_name;
        END IF;
    END LOOP;
END $$;

-- Step 4: Update existing data to fit new structure
-- If there's existing data, we need to migrate it properly
DO $$
DECLARE
    user_record RECORD;
    level_num INTEGER;
    slot_num INTEGER;
BEGIN
    -- Clear existing data and reinitialize with proper structure
    DELETE FROM public.pivot_vesting;
    
    -- Get all users who should have vesting slots
    FOR user_record IN 
        SELECT DISTINCT user_uuid 
        FROM public.user_shares 
        WHERE user_uuid IS NOT NULL
    LOOP
        -- Create 18 slots for each user (6 slots × 3 levels)
        FOR level_num IN 1..3 LOOP
            FOR slot_num IN 1..6 LOOP
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
                    'available',
                    NOW(),
                    NOW()
                ) ON CONFLICT (user_uuid, level, slot_number) DO NOTHING;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Initialized vesting slots for user: %', user_record.user_uuid;
    END LOOP;
END $$;

-- Step 5: Recreate unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'pivot_vesting_user_uuid_level_slot_number_key' 
                   AND table_name = 'pivot_vesting') THEN
        ALTER TABLE public.pivot_vesting 
        ADD CONSTRAINT pivot_vesting_user_uuid_level_slot_number_key 
        UNIQUE (user_uuid, level, slot_number);
    END IF;
END $$;

-- Step 6: Recreate indexes for performance
DROP INDEX IF EXISTS idx_pivot_vesting_user_uuid;
DROP INDEX IF EXISTS idx_pivot_vesting_status;
DROP INDEX IF EXISTS idx_pivot_vesting_end_time;
DROP INDEX IF EXISTS idx_pivot_vesting_user_level;
DROP INDEX IF EXISTS idx_pivot_vesting_user_status;

CREATE INDEX idx_pivot_vesting_user_uuid ON public.pivot_vesting(user_uuid);
CREATE INDEX idx_pivot_vesting_status ON public.pivot_vesting(status);
CREATE INDEX idx_pivot_vesting_end_time ON public.pivot_vesting(end_time) WHERE end_time IS NOT NULL;
CREATE INDEX idx_pivot_vesting_user_level ON public.pivot_vesting(user_uuid, level);
CREATE INDEX idx_pivot_vesting_user_status ON public.pivot_vesting(user_uuid, status);

-- Step 7: Update RLS policies
DROP POLICY IF EXISTS "Users can view their own vesting slots" ON public.pivot_vesting;
DROP POLICY IF EXISTS "Users can update their own vesting slots" ON public.pivot_vesting;

CREATE POLICY "Users can view their own vesting slots" ON public.pivot_vesting
    FOR SELECT USING (auth.uid() = user_uuid);

CREATE POLICY "Users can update their own vesting slots" ON public.pivot_vesting
    FOR UPDATE USING (auth.uid() = user_uuid);

-- Step 8: Create/update the trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_pivot_vesting_updated_at ON public.pivot_vesting;
DROP FUNCTION IF EXISTS update_pivot_vesting_updated_at();

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

-- Step 9: Grant permissions
GRANT SELECT, UPDATE ON public.pivot_vesting TO authenticated;

-- Final verification
DO $$
DECLARE
    total_slots INTEGER;
    total_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_slots FROM public.pivot_vesting;
    SELECT COUNT(DISTINCT user_uuid) INTO total_users FROM public.pivot_vesting;
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Total vesting slots: %', total_slots;
    RAISE NOTICE 'Total users with slots: %', total_users;
    RAISE NOTICE 'Expected slots per user: 18 (6 slots × 3 levels)';
    
    IF total_users > 0 AND total_slots != (total_users * 18) THEN
        RAISE WARNING 'Slot count mismatch! Expected: %, Actual: %', (total_users * 18), total_slots;
    END IF;
END $$;

-- Show final table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pivot_vesting' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

RAISE NOTICE 'pivot_vesting table migration completed!';
RAISE NOTICE 'New structure includes:';
RAISE NOTICE '- level (1-3): Retail/Small Business/Corporate';
RAISE NOTICE '- slot_number (1-6): 6 slots per level';
RAISE NOTICE '- amount: Fractional shares with 4 decimal precision';
RAISE NOTICE '- status: available/vesting/ready_to_claim/claimed';
RAISE NOTICE '- start_time, end_time, claimed_at: Proper timestamps';
