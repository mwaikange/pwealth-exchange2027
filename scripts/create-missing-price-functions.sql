-- Create all missing price-related functions with proper TIMESTAMPTZ handling
-- This fixes the "Could not find the function public.get_price_history" error

-- 1️⃣ Create the missing get_price_history function
CREATE OR REPLACE FUNCTION get_price_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  date TEXT,
  price NUMERIC,
  hodl_percentage NUMERIC,
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
    COALESCE(get_hodl_percentage_for_date(wp.effective_date), 75.0) as hodl_percentage,
    wp.j200_growth as j200_growth,
    wp.price_change as price_change
  FROM weekly_prices wp
  WHERE wp.effective_date >= (CURRENT_DATE - (days_back || ' days')::INTERVAL)
  ORDER BY wp.effective_date DESC;
END;
$$;

-- 2️⃣ Create get_latest_share_price function (used by price context)
CREATE OR REPLACE FUNCTION get_latest_share_price()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_price NUMERIC;
BEGIN
  SELECT final_price INTO latest_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Return default if no price found
  RETURN COALESCE(latest_price, 108.2);
END;
$$;

-- 3️⃣ Create get_current_hodl_percentage function (used by price context)
CREATE OR REPLACE FUNCTION get_current_hodl_percentage()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hodl_pct NUMERIC;
BEGIN
  -- Calculate current HODL percentage from user balances
  WITH user_stats AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN share_balance > 0 THEN 1 END) as hodl_users
    FROM user_profiles
    WHERE share_balance IS NOT NULL
  )
  SELECT 
    CASE 
      WHEN total_users > 0 THEN ROUND((hodl_users::NUMERIC / total_users::NUMERIC) * 100, 2)
      ELSE 75.0
    END INTO hodl_pct
  FROM user_stats;
  
  RETURN COALESCE(hodl_pct, 75.0);
END;
$$;

-- 4️⃣ Create helper function for historical HODL percentage
CREATE OR REPLACE FUNCTION get_hodl_percentage_for_date(target_date DATE)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hodl_pct NUMERIC;
BEGIN
  -- For now, return current HODL percentage
  -- In future, this could query historical data if available
  SELECT get_current_hodl_percentage() INTO hodl_pct;
  
  RETURN hodl_pct;
END;
$$;

-- 5️⃣ Create validate_jse200_data function (used by monitoring)
CREATE OR REPLACE FUNCTION validate_jse200_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_result json;
  total_records INTEGER;
  recent_records INTEGER;
  data_quality TEXT;
BEGIN
  -- Count total JSE200 records
  SELECT COUNT(*) INTO total_records
  FROM "JSE200_PriceUpdate_Mondays";
  
  -- Count recent records (last 8 weeks)
  SELECT COUNT(*) INTO recent_records
  FROM "JSE200_PriceUpdate_Mondays"
  WHERE created_at > (now() - INTERVAL '8 weeks');
  
  -- Determine data quality
  data_quality := CASE 
    WHEN recent_records >= 6 THEN 'GOOD'
    WHEN recent_records >= 3 THEN 'FAIR'
    ELSE 'POOR'
  END;
  
  validation_result := json_build_object(
    'total_records', total_records,
    'recent_records_8w', recent_records,
    'data_quality', data_quality,
    'last_update', (
      SELECT created_at 
      FROM "JSE200_PriceUpdate_Mondays" 
      ORDER BY created_at DESC 
      LIMIT 1
    ),
    'validation_timestamp', now()
  );
  
  RETURN validation_result;
END;
$$;

-- 6️⃣ Create get_price_calculation_summary function
CREATE OR REPLACE FUNCTION get_price_calculation_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  summary_result json;
  total_calculations INTEGER;
  latest_calculation RECORD;
  avg_price_change NUMERIC;
BEGIN
  -- Count total price calculations
  SELECT COUNT(*) INTO total_calculations
  FROM weekly_prices;
  
  -- Get latest calculation
  SELECT * INTO latest_calculation
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Calculate average price change
  SELECT AVG(price_change) INTO avg_price_change
  FROM weekly_prices
  WHERE price_change IS NOT NULL;
  
  summary_result := json_build_object(
    'total_calculations', total_calculations,
    'latest_calculation_date', latest_calculation.effective_date,
    'latest_price', latest_calculation.final_price,
    'latest_change', latest_calculation.price_change,
    'average_weekly_change', ROUND(avg_price_change, 2),
    'summary_timestamp', now()
  );
  
  RETURN summary_result;
END;
$$;

-- 7️⃣ Fix the existing get_current_share_price function to handle missing data
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_price NUMERIC;
BEGIN
  -- Get the most recent final price
  SELECT final_price INTO current_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Return default price if no data found
  RETURN COALESCE(current_price, 108.2);
END;
$$;

-- 8️⃣ Add comments for documentation
COMMENT ON FUNCTION get_price_history(INTEGER) IS 'Returns price history for the specified number of days back';
COMMENT ON FUNCTION get_latest_share_price() IS 'Returns the most recent share price from weekly_prices table';
COMMENT ON FUNCTION get_current_hodl_percentage() IS 'Calculates current HODL percentage from user balances';
COMMENT ON FUNCTION get_hodl_percentage_for_date(DATE) IS 'Returns HODL percentage for a specific date';
COMMENT ON FUNCTION validate_jse200_data() IS 'Validates JSE200 data quality and completeness';
COMMENT ON FUNCTION get_price_calculation_summary() IS 'Returns summary statistics for price calculations';
