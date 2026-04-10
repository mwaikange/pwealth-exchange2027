-- Step 1: Backup the original table (optional but recommended)
CREATE TABLE IF NOT EXISTS pivot_vesting_backup AS TABLE pivot_vesting;

-- Step 2: Drop deprecated columns (if they exist)
ALTER TABLE pivot_vesting
DROP COLUMN IF EXISTS slot_position,
DROP COLUMN IF EXISTS progress,
DROP COLUMN IF EXISTS shares_locked,
DROP COLUMN IF EXISTS shares_vested,
DROP COLUMN IF EXISTS shares_claimed,
DROP COLUMN IF EXISTS lock_date,
DROP COLUMN IF EXISTS vest_date,
DROP COLUMN IF EXISTS prematurely_claimed;

-- Step 3: Add new standard vesting columns
ALTER TABLE pivot_vesting
ADD COLUMN IF NOT EXISTS level INTEGER,
ADD COLUMN IF NOT EXISTS slot_number INTEGER,
ADD COLUMN IF NOT EXISTS amount NUMERIC,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'vest',
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Step 4: Update existing status values based on maturity
-- Update matured slots to 'claim' status
UPDATE pivot_vesting 
SET status = 'claim' 
WHERE status = 'locked' 
AND end_time IS NOT NULL 
AND end_time <= NOW();

-- Keep non-matured slots as 'locked'
UPDATE pivot_vesting 
SET status = 'locked' 
WHERE status = 'locked' 
AND (end_time IS NULL OR end_time > NOW());

-- Step 5: Add constraints for status values
ALTER TABLE pivot_vesting 
DROP CONSTRAINT IF EXISTS pivot_vesting_status_check;

ALTER TABLE pivot_vesting 
ADD CONSTRAINT pivot_vesting_status_check 
CHECK (status IN ('vest', 'locked', 'claim'));

-- Step 6: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_user ON pivot_vesting(user_uuid);
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_level_slot ON pivot_vesting(user_uuid, level, slot_number);
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_status ON pivot_vesting(status);
CREATE INDEX IF NOT EXISTS idx_pivot_vesting_end_time ON pivot_vesting(end_time) WHERE status = 'locked';

-- Step 7: Create function to auto-update matured slots
CREATE OR REPLACE FUNCTION update_matured_vesting_slots()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update matured locked slots to claim status
    UPDATE pivot_vesting 
    SET status = 'claim',
        updated_at = NOW()
    WHERE status = 'locked' 
    AND end_time IS NOT NULL 
    AND end_time <= NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to vest shares in a slot
CREATE OR REPLACE FUNCTION vest_shares_in_slot(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER,
    p_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
    v_start_time TIMESTAMPTZ := NOW();
    v_end_time TIMESTAMPTZ;
    v_hold_days INTEGER;
    v_result JSON;
BEGIN
    -- Determine hold period based on level
    CASE p_level
        WHEN 1 THEN v_hold_days := 5;   -- Retail
        WHEN 2 THEN v_hold_days := 30;  -- Small Business
        WHEN 3 THEN v_hold_days := 90;  -- Corporate
        ELSE RAISE EXCEPTION 'Invalid vesting level: %', p_level;
    END CASE;
    
    v_end_time := v_start_time + (v_hold_days || ' days')::INTERVAL;
    
    -- Insert or update the vesting slot
    INSERT INTO pivot_vesting (
        user_uuid, level, slot_number, amount, status, 
        start_time, end_time, created_at, updated_at
    )
    VALUES (
        p_user_uuid, p_level, p_slot_number, p_amount, 'locked',
        v_start_time, v_end_time, NOW(), NOW()
    )
    ON CONFLICT (user_uuid, level, slot_number) 
    DO UPDATE SET
        amount = EXCLUDED.amount,
        status = 'locked',
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        updated_at = NOW();
    
    -- Return success result
    SELECT json_build_object(
        'success', true,
        'message', 'Shares vested successfully',
        'slot_id', (SELECT id FROM pivot_vesting WHERE user_uuid = p_user_uuid AND level = p_level AND slot_number = p_slot_number),
        'amount', p_amount,
        'end_time', v_end_time
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to claim vested shares
CREATE OR REPLACE FUNCTION claim_vested_shares(
    p_slot_id UUID,
    p_user_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    v_slot_amount NUMERIC;
    v_result JSON;
BEGIN
    -- Get the slot amount and verify it's claimable
    SELECT amount INTO v_slot_amount
    FROM pivot_vesting
    WHERE id = p_slot_id 
    AND user_uuid = p_user_uuid 
    AND status = 'claim';
    
    IF v_slot_amount IS NULL THEN
        RAISE EXCEPTION 'Slot not found or not claimable';
    END IF;
    
    -- Delete the slot (reset to available state)
    DELETE FROM pivot_vesting 
    WHERE id = p_slot_id AND user_uuid = p_user_uuid;
    
    -- Return success result
    SELECT json_build_object(
        'success', true,
        'message', 'Shares claimed successfully',
        'amount', v_slot_amount
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create scheduled job to auto-update matured slots (if pg_cron is available)
-- SELECT cron.schedule('update-vesting-slots', '*/5 * * * *', 'SELECT update_matured_vesting_slots();');

-- Step 11: Verify the updates
SELECT 
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM pivot_vesting 
GROUP BY status
ORDER BY status;

COMMIT;
