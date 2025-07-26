-- Remove HODL-related columns and functions from the price system

-- 1. Drop HODL-related functions first
DROP FUNCTION IF EXISTS get_current_hodl_percentage();
DROP FUNCTION IF EXISTS get_hodl_percentage_for_date(DATE);
DROP FUNCTION IF EXISTS calculate_hodl_percentage();

-- 2. Remove HODL column from weekly_prices table if it exists
ALTER TABLE weekly_prices DROP COLUMN IF EXISTS hodl_percentage;

-- 3. Clean up any HODL references in existing functions
-- This will be handled in the next script

-- 4. Verify cleanup
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'weekly_prices' 
AND column_name LIKE '%hodl%';

COMMENT ON SCRIPT IS 'Removed all HODL-related functionality from price system';
