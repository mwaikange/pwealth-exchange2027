-- Remove all HODL-related functionality from the price system
-- This script cleans up database structure and functions

-- 1️⃣ Drop all HODL-related functions
DROP FUNCTION IF EXISTS get_current_hodl_percentage();
DROP FUNCTION IF EXISTS get_hodl_percentage_for_date(DATE);
DROP FUNCTION IF EXISTS calculate_hodl_percentage();
DROP FUNCTION IF EXISTS update_hodl_percentage();

-- 2️⃣ Remove HODL column from weekly_prices table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'weekly_prices' 
        AND column_name = 'hodl_percentage'
    ) THEN
        ALTER TABLE weekly_prices DROP COLUMN hodl_percentage;
        RAISE NOTICE 'Removed hodl_percentage column from weekly_prices table';
    ELSE
        RAISE NOTICE 'hodl_percentage column does not exist in weekly_prices table';
    END IF;
END $$;

-- 3️⃣ Update get_price_history function to remove HODL references
CREATE OR REPLACE FUNCTION get_price_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  date TEXT,
  price NUMERIC,
  j200_growth NUMERIC,
  price_change NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.effective_date::TEXT as date,
    wp.final_price as price,
    COALESCE(wp.j200_growth, 0) as j200_growth,
    COALESCE(wp.price_change, 0) as price_change
  FROM weekly_prices wp
  WHERE wp.effective_date >= (CURRENT_DATE - INTERVAL '1 day' * days_back)
  ORDER BY wp.effective_date DESC;
END;
$$;

-- 4️⃣ Clean up any views that might reference HODL
DROP VIEW IF EXISTS price_history_with_hodl;
DROP VIEW IF EXISTS hodl_percentage_history;

-- 5️⃣ Update comments to reflect HODL removal
COMMENT ON FUNCTION get_price_history(INTEGER) IS 'Returns price history based on JSE200 data only - HODL functionality removed';

-- 6️⃣ Log the cleanup
DO $$
BEGIN
    RAISE NOTICE 'HODL cleanup completed at %', now();
    RAISE NOTICE 'All HODL-related functions, columns, and views have been removed';
    RAISE NOTICE 'Price system now operates purely on JSE200 percentage changes';
END $$;
