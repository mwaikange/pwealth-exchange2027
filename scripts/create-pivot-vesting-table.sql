-- Create new pivot_vesting table based on the old vesting_schedule structure
-- This will replace the current vesting system with a more robust approach

-- Drop existing table if it exists (be careful in production)
-- DROP TABLE IF EXISTS pivot_vesting CASCADE;

CREATE TABLE IF NOT EXISTS pivot_vesting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    level INTEGER NOT NULL CHECK (level IN (1, 2, 3)), -- 1=Retail, 2=Small Business, 3=Corporate
    slot_position CHAR(1) NOT NULL CHECK (slot_position IN ('A', 'B', 'C', 'D', 'E', 'F')), -- 6 slots per level
    
    -- Status tracking
    activated BOOLEAN DEFAULT FALSE,
    invested BOOLEAN DEFAULT FALSE, 
    claimed BOOLEAN DEFAULT FALSE,
    prematurely_claimed BOOLEAN DEFAULT FALSE,
    
    -- Share and progress tracking
    shares_amount NUMERIC DEFAULT 0 CHECK (shares_amount >= 0),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Timing
    start_time TIMESTAMPTZ NULL,
    last_claim_time TIMESTAMPTZ NULL,
    completion_time TIMESTAMPTZ NULL,
    last_claim_percentage INTEGER DEFAULT 0,
    
    -- Metadata
    level_rank INTEGER NOT NULL, -- 1-6 for ordering within level
    reset_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique slot per user per level
    UNIQUE(user_uuid, level, slot_position)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_user_uuid ON pivot_vesting(user_uuid);
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_level ON pivot_vesting(level);
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_status ON pivot_vesting(activated, invested, claimed);
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_progress ON pivot_vesting(progress);

-- Enable RLS
ALTER TABLE pivot_vesting ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own vesting slots" ON pivot_vesting
    FOR SELECT USING (auth.uid() = user_uuid);

CREATE POLICY "Users can update own vesting slots" ON pivot_vesting
    FOR UPDATE USING (auth.uid() = user_uuid);

CREATE POLICY "Users can insert own vesting slots" ON pivot_vesting
    FOR INSERT WITH CHECK (auth.uid() = user_uuid);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_pivot_vesting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_pivot_vesting_timestamp
    BEFORE UPDATE ON pivot_vesting
    FOR EACH ROW EXECUTE FUNCTION update_pivot_vesting_timestamp();

-- Function to initialize vesting slots for a user (18 slots total: 6 per level)
CREATE OR REPLACE FUNCTION initialize_user_vesting_slots(p_user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    level_num INTEGER;
    slot_char CHAR(1);
    slot_positions CHAR(1)[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F'];
    rank_counter INTEGER;
BEGIN
    -- Create slots for each level (1, 2, 3)
    FOR level_num IN 1..3 LOOP
        rank_counter := 1;
        
        -- Create 6 slots (A-F) for each level
        FOREACH slot_char IN ARRAY slot_positions LOOP
            INSERT INTO pivot_vesting (
                user_uuid,
                level,
                slot_position,
                level_rank,
                activated,
                invested,
                claimed,
                shares_amount,
                progress
            ) VALUES (
                p_user_uuid,
                level_num,
                slot_char,
                rank_counter,
                FALSE,
                FALSE,
                FALSE,
                0,
                0
            )
            ON CONFLICT (user_uuid, level, slot_position) DO NOTHING; -- Prevent duplicates
            
            rank_counter := rank_counter + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Initialized 18 vesting slots for user %', p_user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get available slots for a specific level
CREATE OR REPLACE FUNCTION get_available_vesting_slots(p_user_uuid UUID, p_level INTEGER)
RETURNS TABLE (
    id UUID,
    slot_position CHAR(1),
    level_rank INTEGER,
    activated BOOLEAN,
    invested BOOLEAN,
    claimed BOOLEAN,
    shares_amount NUMERIC,
    progress INTEGER,
    start_time TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pv.id,
        pv.slot_position,
        pv.level_rank,
        pv.activated,
        pv.invested,
        pv.claimed,
        pv.shares_amount,
        pv.progress,
        pv.start_time
    FROM pivot_vesting pv
    WHERE pv.user_uuid = p_user_uuid 
      AND pv.level = p_level
    ORDER BY pv.level_rank;
END;
$$ LANGUAGE plpgsql;

-- Function to vest shares in a specific slot
CREATE OR REPLACE FUNCTION vest_shares_in_slot(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_position CHAR(1),
    p_shares_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
    slot_available BOOLEAN := FALSE;
BEGIN
    -- Check if slot is available (not activated and not invested)
    SELECT NOT activated AND NOT invested INTO slot_available
    FROM pivot_vesting
    WHERE user_uuid = p_user_uuid 
      AND level = p_level 
      AND slot_position = p_slot_position;
    
    IF NOT slot_available THEN
        RAISE EXCEPTION 'Slot % at level % is not available for vesting', p_slot_position, p_level;
    END IF;
    
    -- Update the slot with vesting information
    UPDATE pivot_vesting
    SET 
        activated = TRUE,
        invested = TRUE,
        shares_amount = p_shares_amount,
        start_time = NOW(),
        progress = 0,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid 
      AND level = p_level 
      AND slot_position = p_slot_position;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to claim shares from a completed slot
CREATE OR REPLACE FUNCTION claim_shares_from_slot(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_position CHAR(1)
)
RETURNS NUMERIC AS $$
DECLARE
    shares_to_claim NUMERIC := 0;
    slot_progress INTEGER := 0;
BEGIN
    -- Get current progress and shares amount
    SELECT progress, shares_amount INTO slot_progress, shares_to_claim
    FROM pivot_vesting
    WHERE user_uuid = p_user_uuid 
      AND level = p_level 
      AND slot_position = p_slot_position
      AND activated = TRUE 
      AND invested = TRUE 
      AND claimed = FALSE;
    
    -- Check if slot is ready for claiming (100% progress)
    IF slot_progress < 100 THEN
        RAISE EXCEPTION 'Slot % at level % is not ready for claiming (only % complete)', 
                       p_slot_position, p_level, slot_progress;
    END IF;
    
    -- Mark slot as claimed
    UPDATE pivot_vesting
    SET 
        claimed = TRUE,
        last_claim_time = NOW(),
        completion_time = NOW(),
        last_claim_percentage = 100,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid 
      AND level = p_level 
      AND slot_position = p_slot_position;
    
    RETURN shares_to_claim;
END;
$$ LANGUAGE plpgsql;

-- Initialize slots for existing users (run this once)
-- INSERT INTO pivot_vesting (user_uuid, level, slot_position, level_rank)
-- SELECT 
--     u.id as user_uuid,
--     level_num,
--     slot_pos,
--     rank_num
-- FROM auth.users u
-- CROSS JOIN (VALUES (1), (2), (3)) AS levels(level_num)
-- CROSS JOIN (VALUES ('A', 1), ('B', 2), ('C', 3), ('D', 4), ('E', 5), ('F', 6)) AS slots(slot_pos, rank_num)
-- ON CONFLICT (user_uuid, level, slot_position) DO NOTHING;

COMMENT ON TABLE pivot_vesting IS 'New vesting system with 18 slots per user (6 slots × 3 levels)';
COMMENT ON COLUMN pivot_vesting.level IS '1=Retail(5d), 2=Small Business(30d), 3=Corporate(90d)';
COMMENT ON COLUMN pivot_vesting.slot_position IS 'A-F representing the 6 slots per level';
COMMENT ON COLUMN pivot_vesting.progress IS 'Vesting progress from 0-100%';
