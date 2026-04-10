-- Remove all HODL-related functionality from the price system
-- This script removes HODL columns, functions, and references

-- 1. Drop HODL-related functions first
DROP FUNCTION IF EXISTS get_current_hodl_percentage();
DROP FUNCTION IF EXISTS get_hodl_percentage_for_date(DATE);
DROP FUNCTION IF EXISTS calculate_hodl_percentage();

-- 2. Remove HODL column from weekly_prices table if it exists
ALTER TABLE weekly_prices DROP COLUMN IF EXISTS hodl_percentage;

-- 3. Clean up any HODL-related views
DROP VIEW IF EXISTS hodl_statistics;
DROP VIEW IF EXISTS price_with_hodl;

-- 4. Remove any HODL-related indexes
DROP INDEX IF EXISTS idx_weekly_prices_hodl;

-- 5. Clean up any HODL-related triggers
DROP TRIGGER IF EXISTS update_hodl_percentage ON weekly_prices;

COMMENT ON TABLE weekly_prices IS 'Weekly share prices based purely on JSE200 percentage changes - HODL removed';

-- Log the cleanup
DO $$
BEGIN
    RAISE NOTICE 'HODL functionality completely removed from price system at %', NOW();
END $$;
