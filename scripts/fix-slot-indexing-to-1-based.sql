-- ✅ Fix Slot Indexing: Convert from 0-based to 1-based indexing
-- This script safely migrates existing slot_number values and ensures all future operations use 1-based indexing

BEGIN;

-- Step 1: Remove any existing constraints that might conflict
ALTER TABLE pivot_vesting DROP CONSTRAINT IF EXISTS pivot_vesting_slot_number_check;
ALTER TABLE pivot_vesting DROP CONSTRAINT IF EXISTS pivot_vesting_user_level_slot_unique;

-- Step 2: Handle duplicate prevention - Remove any duplicates that might exist
-- This creates a temporary table with unique records, keeping the most recent ones
CREATE TEMP TABLE temp_unique_vesting AS
SELECT DISTINCT ON (user_uuid, level, slot_number) 
    id, user_uuid, level, slot_number, shares, status, created_at, updated_at
FROM pivot_vesting
ORDER BY user_uuid, level, slot_number, created_at DESC;

-- Step 3: Clear the original table and restore unique records
TRUNCATE TABLE pivot_vesting;
INSERT INTO pivot_vesting (id, user_uuid, level, slot_number, shares, status, created_at, updated_at)
SELECT id, user_uuid, level, slot_number, shares, status, created_at, updated_at
FROM temp_unique_vesting;

-- Step 4: Update existing slot_number values from 0-based to 1-based
-- Only update if slot_number is between 0-5 (valid 0-based range)
UPDATE pivot_vesting 
SET slot_number = slot_number + 1 
WHERE slot_number >= 0 AND slot_number <= 5;

-- Step 5: Handle any NULL slot_number values by assigning proper 1-6 values
-- This ensures each user has slots 1-6 for each level
WITH user_levels AS (
    SELECT DISTINCT user_uuid, level 
    FROM pivot_vesting 
    WHERE slot_number IS NULL
),
slot_assignments AS (
    SELECT 
        user_uuid, 
        level,
        ROW_NUMBER() OVER (PARTITION BY user_uuid, level ORDER BY created_at) as new_slot_number
    FROM pivot_vesting 
    WHERE slot_number IS NULL
)
UPDATE pivot_vesting 
SET slot_number = sa.new_slot_number
FROM slot_assignments sa
WHERE pivot_vesting.user_uuid = sa.user_uuid 
    AND pivot_vesting.level = sa.level 
    AND pivot_vesting.slot_number IS NULL;

-- Step 6: Ensure all users have complete slot sets (1-6 for each level 1-3)
-- Insert missing slots with default values
INSERT INTO pivot_vesting (user_uuid, level, slot_number, shares, status, created_at, updated_at)
SELECT 
    u.user_uuid,
    l.level,
    s.slot_number,
    0 as shares,
    'locked' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM (
    SELECT DISTINCT user_uuid FROM pivot_vesting
) u
CROSS JOIN (
    SELECT generate_series(1, 3) as level
) l
CROSS JOIN (
    SELECT generate_series(1, 6) as slot_number
) s
WHERE NOT EXISTS (
    SELECT 1 FROM pivot_vesting pv 
    WHERE pv.user_uuid = u.user_uuid 
        AND pv.level = l.level 
        AND pv.slot_number = s.slot_number
);

-- Step 7: Add back constraints with 1-based indexing (1-6 range)
ALTER TABLE pivot_vesting 
ADD CONSTRAINT pivot_vesting_slot_number_check 
CHECK (slot_number >= 1 AND slot_number <= 6);

ALTER TABLE pivot_vesting 
ADD CONSTRAINT pivot_vesting_user_level_slot_unique 
UNIQUE (user_uuid, level, slot_number);

-- Step 8: Update all functions to use 1-based indexing
-- Update the vest_shares function
CREATE OR REPLACE FUNCTION vest_shares(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER,
    p_shares DECIMAL(10,4)
) RETURNS BOOLEAN AS $$
BEGIN
    -- Validate slot_number is in 1-6 range (1-based)
    IF p_slot_number < 1 OR p_slot_number > 6 THEN
        RAISE EXCEPTION 'Invalid slot_number: %. Must be between 1 and 6', p_slot_number;
    END IF;

    -- Update or insert the vesting record
    INSERT INTO pivot_vesting (user_uuid, level, slot_number, shares, status, created_at, updated_at)
    VALUES (p_user_uuid, p_level, p_slot_number, p_shares, 'locked', NOW(), NOW())
    ON CONFLICT (user_uuid, level, slot_number)
    DO UPDATE SET 
        shares = EXCLUDED.shares,
        status = 'locked',
        updated_at = NOW();

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update the claim_shares function
CREATE OR REPLACE FUNCTION claim_shares(
    p_user_uuid UUID,
    p_level INTEGER,
    p_slot_number INTEGER
) RETURNS DECIMAL(10,4) AS $$
DECLARE
    v_shares DECIMAL(10,4);
BEGIN
    -- Validate slot_number is in 1-6 range (1-based)
    IF p_slot_number < 1 OR p_slot_number > 6 THEN
        RAISE EXCEPTION 'Invalid slot_number: %. Must be between 1 and 6', p_slot_number;
    END IF;

    -- Get and update the shares
    UPDATE pivot_vesting 
    SET status = 'claimed', updated_at = NOW()
    WHERE user_uuid = p_user_uuid 
        AND level = p_level 
        AND slot_number = p_slot_number
        AND status = 'locked'
    RETURNING shares INTO v_shares;

    IF v_shares IS NULL THEN
        RAISE EXCEPTION 'No locked shares found for user % level % slot %', p_user_uuid, p_level, p_slot_number;
    END IF;

    RETURN v_shares;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Verification queries
SELECT 'Migration Summary:' as info;

SELECT 
    'Total vesting records:' as metric,
    COUNT(*) as value
FROM pivot_vesting;

SELECT 
    'Users with complete slot sets:' as metric,
    COUNT(*) as value
FROM (
    SELECT user_uuid 
    FROM pivot_vesting 
    GROUP BY user_uuid 
    HAVING COUNT(*) = 18  -- 6 slots × 3 levels
) complete_users;

SELECT 
    'Slot number distribution:' as metric,
    slot_number,
    COUNT(*) as count
FROM pivot_vesting 
GROUP BY slot_number 
ORDER BY slot_number;

SELECT 
    'Status distribution:' as metric,
    status,
    COUNT(*) as count
FROM pivot_vesting 
GROUP BY status;

COMMIT;
