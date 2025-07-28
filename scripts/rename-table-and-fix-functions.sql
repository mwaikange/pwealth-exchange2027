-- Rename existing JSE200 table to lowercase and update all function references
-- Uses existing data, does not create new data

DO $$
DECLARE
    pascal_table_exists BOOLEAN := FALSE;
    lowercase_table_exists BOOLEAN := FALSE;
    record_count INTEGER := 0;
    latest_date DATE;
BEGIN
    RAISE NOTICE 'RENAME TABLE AND FIX FUNCTIONS';
    RAISE NOTICE '==============================';
    
    -- Check current table existence
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'JSE200_PriceUpdate_Mondays'
    ) INTO pascal_table_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'jse200_priceupdate_mondays'
    ) INTO lowercase_table_exists;
    
    RAISE NOTICE 'PascalCase table exists: %', pascal_table_exists;
    RAISE NOTICE 'Lowercase table exists: %', lowercase_table_exists;
    
    -- Step 1: Rename table if needed
    IF pascal_table_exists AND NOT lowercase_table_exists THEN
        RAISE NOTICE 'Renaming JSE200_PriceUpdate_Mondays to jse200_priceupdate_mondays';
        
        -- Get current data info before rename
        SELECT COUNT(*) INTO record_count FROM "JSE200_PriceUpdate_Mondays";
        SELECT MAX(week_start_date) INTO latest_date FROM "JSE200_PriceUpdate_Mondays";
        
        RAISE NOTICE 'Preserving % existing records', record_count;
        RAISE NOTICE 'Latest data: %', latest_date;
        
        -- Rename the table
        ALTER TABLE "JSE200_PriceUpdate_Mondays" RENAME TO jse200_priceupdate_mondays;
        
        RAISE NOTICE 'Table renamed successfully';
        
    ELSIF lowercase_table_exists AND NOT pascal_table_exists THEN
        RAISE NOTICE 'Table already has correct lowercase name';
        SELECT COUNT(*) INTO record_count FROM jse200_priceupdate_mondays;
        SELECT MAX(week_start_date) INTO latest_date FROM jse200_priceupdate_mondays;
        
    ELSIF pascal_table_exists AND lowercase_table_exists THEN
        RAISE NOTICE 'WARNING: Both tables exist - using lowercase one';
        SELECT COUNT(*) INTO record_count FROM jse200_priceupdate_mondays;
        SELECT MAX(week_start_date) INTO latest_date FROM jse200_priceupdate_mondays;
        
    ELSE
        RAISE NOTICE 'ERROR: No JSE200 table found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Final table: jse200_priceupdate_mondays';
    RAISE NOTICE 'Records: %', record_count;
    RAISE NOTICE 'Latest data: %', latest_date;
    
END $$;

-- Step 2: Update function definitions to use lowercase table name
-- Drop and recreate the main price calculation function with correct table reference

DROP FUNCTION IF EXISTS calculate_weekly_share_price_simplified();

CREATE OR REPLACE FUNCTION calculate_weekly_share_price_simplified()
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_price NUMERIC,
  growth_rate NUMERIC
) AS $$
DECLARE
  latest_jse200 RECORD;
  previous_price RECORD;
  new_base_price NUMERIC;
  new_final_price NUMERIC;
  new_price_change NUMERIC;
  current_week_date DATE;
BEGIN
  -- Get current Monday date
  current_week_date := date_trunc('week', CURRENT_DATE)::DATE + INTERVAL '0 days';
  
  -- Check if we already have a price for this week
  IF EXISTS (
    SELECT 1 FROM weekly_prices 
    WHERE effective_date = current_week_date
  ) THEN
    RETURN QUERY SELECT 
      FALSE as success,
      'Price already calculated for this week' as message,
      NULL::NUMERIC as new_price,
      NULL::NUMERIC as growth_rate;
    RETURN;
  END IF;

  -- Get the latest JSE200 update (FIXED: using lowercase table name)
  SELECT * INTO latest_jse200
  FROM jse200_priceupdate_mondays
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if we have JSE200 data
  IF latest_jse200 IS NULL THEN
    RETURN QUERY SELECT 
      FALSE as success,
      'No JSE200 data available' as message,
      NULL::NUMERIC as new_price,
      NULL::NUMERIC as growth_rate;
    RETURN;
  END IF;

  -- Get the previous week's final price as base price
  SELECT * INTO previous_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Set base price (fallback to 100.00 if no previous data)
  IF previous_price IS NULL THEN
    new_base_price := 100.00;
  ELSE
    new_base_price := previous_price.final_price;
  END IF;

  -- Calculate new final price using JSE200 growth
  -- final_price = base_price * (1 + (j200_growth / 100))
  new_final_price := new_base_price * (1 + (COALESCE(latest_jse200.percent_change, 0) / 100));
  
  -- Calculate price change
  new_price_change := new_final_price - new_base_price;

  -- Insert new weekly price record
  INSERT INTO weekly_prices (
    effective_date,
    base_price,
    j200_growth,
    final_price,
    price_change,
    created_at
  ) VALUES (
    current_week_date,
    new_base_price,
    COALESCE(latest_jse200.percent_change, 0),
    new_final_price,
    new_price_change,
    NOW()
  );

  -- Return success
  RETURN QUERY SELECT 
    TRUE as success,
    FORMAT('Price updated successfully. New price: %s (Growth: %s%%)', 
           new_final_price, latest_jse200.percent_change) as message,
    new_final_price as new_price,
    COALESCE(latest_jse200.percent_change, 0) as growth_rate;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    FALSE as success,
    FORMAT('Error calculating price: %s', SQLERRM) as message,
    NULL::NUMERIC as new_price,
    NULL::NUMERIC as growth_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate other functions (they should already be correct, but ensuring consistency)
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
  current_price NUMERIC;
BEGIN
  SELECT final_price INTO current_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Return fallback price if no data exists
  RETURN COALESCE(current_price, 100.00);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_price_history(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  effective_date DATE,
  base_price NUMERIC,
  j200_growth NUMERIC,
  final_price NUMERIC,
  price_change NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.effective_date,
    wp.base_price,
    wp.j200_growth,
    wp.final_price,
    wp.price_change,
    wp.created_at
  FROM weekly_prices wp
  ORDER BY wp.effective_date DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_weekly_price_calculation()
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_price NUMERIC,
  growth_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM calculate_weekly_share_price_simplified();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_weekly_share_price_simplified() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_share_price() TO authenticated;
GRANT EXECUTE ON FUNCTION get_price_history(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_weekly_price_calculation() TO authenticated;

DO $$
BEGIN
    RAISE NOTICE 'ALL FUNCTIONS UPDATED TO USE: jse200_priceupdate_mondays';
    RAISE NOTICE 'Functions ready for use';
END $$;
