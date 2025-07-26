-- Remove all HODL-related functionality from the price calculation system
-- This script cleans up tables, functions, and removes HODL dependencies

-- 1️⃣ Drop all HODL-related functions
DROP FUNCTION IF EXISTS get_current_hodl_percentage();
DROP FUNCTION IF EXISTS get_hodl_percentage_for_date(DATE);

-- 2️⃣ Remove HODL columns from weekly_prices table if they exist
DO $$
BEGIN
    -- Check if hodl_percentage column exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'weekly_prices' 
        AND column_name = 'hodl_percentage'
    ) THEN
        ALTER TABLE weekly_prices DROP COLUMN hodl_percentage;
        RAISE NOTICE 'Dropped hodl_percentage column from weekly_prices';
    END IF;
    
    -- Check if any other HODL-related columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'weekly_prices' 
        AND column_name LIKE '%hodl%'
    ) THEN
        RAISE NOTICE 'Found other HODL-related columns in weekly_prices - manual review needed';
    END IF;
END $$;

-- 3️⃣ Update get_price_history function to remove HODL
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
    wp.j200_growth as j200_growth,
    wp.price_change as price_change
  FROM weekly_prices wp
  WHERE wp.effective_date >= (CURRENT_DATE - (days_back || ' days')::INTERVAL)
  ORDER BY wp.effective_date DESC;
END;
$$;

-- 4️⃣ Update get_detailed_price_history function to remove HODL
CREATE OR REPLACE FUNCTION get_detailed_price_history(weeks_back INTEGER DEFAULT 10)
RETURNS TABLE(
  week_number INTEGER,
  effective_date DATE,
  base_price NUMERIC,
  jse200_percent_change NUMERIC,
  calculated_price NUMERIC,
  actual_price_change NUMERIC,
  cumulative_return_percent NUMERIC,
  week_over_week_change NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH price_history AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY wp.effective_date DESC) as week_num,
      wp.effective_date,
      wp.base_price,
      wp.j200_growth as jse200_change,
      wp.final_price,
      wp.price_change,
      LAG(wp.final_price) OVER (ORDER BY wp.effective_date) as prev_price
    FROM weekly_prices wp
    ORDER BY wp.effective_date DESC
    LIMIT weeks_back
  ),
  calculated_history AS (
    SELECT 
      week_num,
      effective_date,
      base_price,
      jse200_change,
      final_price,
      price_change,
      -- Calculate cumulative return from first price
      ROUND(((final_price / FIRST_VALUE(final_price) OVER (ORDER BY effective_date DESC ROWS UNBOUNDED PRECEDING)) - 1) * 100, 2) as cum_return,
      -- Week over week change
      CASE 
        WHEN prev_price IS NOT NULL THEN ROUND(((final_price / prev_price) - 1) * 100, 2)
        ELSE 0
      END as wow_change
    FROM price_history
  )
  SELECT 
    week_num::INTEGER,
    effective_date,
    base_price,
    jse200_change,
    final_price,
    price_change,
    cum_return,
    wow_change
  FROM calculated_history
  ORDER BY effective_date DESC;
END;
$$;

-- 5️⃣ Clean up any views that reference HODL
DO $$
DECLARE
    view_record RECORD;
BEGIN
    -- Find views that might reference HODL
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE definition ILIKE '%hodl%'
        AND schemaname = 'public'
    LOOP
        RAISE NOTICE 'Found view % that references HODL - manual review needed', view_record.viewname;
    END LOOP;
END $$;

-- 6️⃣ Update comments to reflect HODL removal
COMMENT ON FUNCTION get_price_history(INTEGER) IS 'Returns price history without HODL data - only JSE200 growth and price changes';
COMMENT ON FUNCTION get_detailed_price_history(INTEGER) IS 'Returns detailed price history with calculations - HODL functionality removed';

-- 7️⃣ Verify the cleanup
SELECT 
    'weekly_prices' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'weekly_prices'
AND column_name LIKE '%hodl%';
