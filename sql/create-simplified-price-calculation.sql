-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS calculate_weekly_share_price_simplified();
DROP FUNCTION IF EXISTS get_current_share_price();
DROP FUNCTION IF EXISTS get_price_history();
DROP FUNCTION IF EXISTS trigger_weekly_price_calculation();

-- Create the main simplified price calculation function
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

  -- Get the latest JSE200 update
  SELECT * INTO latest_jse200
  FROM JSE200_PriceUpdate_Mondays
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

-- Create function to get current share price
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

-- Create function to get price history
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

-- Create manual trigger function for testing
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_weekly_share_price_simplified() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_share_price() TO authenticated;
GRANT EXECUTE ON FUNCTION get_price_history(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_weekly_price_calculation() TO authenticated;
