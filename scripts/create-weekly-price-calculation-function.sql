-- Function to calculate weekly share price based on JSE200 percentage change
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_from_jse200()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_monday date;
  latest_jse_data record;
  last_price_data record;
  new_price numeric;
  calculation_result json;
BEGIN
  -- Get current Monday
  current_monday := date_trunc('week', CURRENT_DATE)::date;
  
  -- Get the most recent JSE200 data
  SELECT * INTO latest_jse_data
  FROM JSE200_PriceUpdate_Mondays
  ORDER BY created_at DESC, week_start DESC
  LIMIT 1;
  
  -- Check if we have JSE200 data
  IF latest_jse_data IS NULL THEN
    RAISE EXCEPTION 'No JSE200 data found for price calculation';
  END IF;
  
  -- Get the last price from weekly_prices table
  SELECT * INTO last_price_data
  FROM weekly_prices
  ORDER BY week_start DESC
  LIMIT 1;
  
  -- Use base price of N$100 if no previous price exists
  IF last_price_data IS NULL THEN
    last_price_data.price := 100.00;
  END IF;
  
  -- Calculate new price: last_price × (1 + (percentage_change / 100))
  new_price := last_price_data.price * (1 + (latest_jse_data.percentage_change / 100));
  
  -- Round to 2 decimal places
  new_price := ROUND(new_price, 2);
  
  -- Insert or update the weekly price
  INSERT INTO weekly_prices (week_start, price, percentage_change, previous_price)
  VALUES (
    current_monday,
    new_price,
    latest_jse_data.percentage_change,
    last_price_data.price
  )
  ON CONFLICT (week_start) 
  DO UPDATE SET 
    price = EXCLUDED.price,
    percentage_change = EXCLUDED.percentage_change,
    previous_price = EXCLUDED.previous_price,
    created_at = now();
  
  -- Prepare result
  calculation_result := json_build_object(
    'success', true,
    'current_monday', current_monday,
    'previous_price', last_price_data.price,
    'percentage_change', latest_jse_data.percentage_change,
    'new_price', new_price,
    'calculation', format('%s × (1 + %s/100) = %s', 
                         last_price_data.price, 
                         latest_jse_data.percentage_change, 
                         new_price),
    'jse200_date', latest_jse_data.date,
    'updated_at', now()
  );
  
  RETURN calculation_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'current_monday', current_monday
    );
END;
$$;

-- Function to manually trigger price calculation (for testing)
CREATE OR REPLACE FUNCTION trigger_weekly_price_calculation()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN calculate_weekly_share_price_from_jse200();
END;
$$;

-- Update the existing get_current_share_price function to use weekly_prices
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_price numeric;
BEGIN
  -- Get the most recent price from weekly_prices table
  SELECT price INTO current_price
  FROM weekly_prices
  ORDER BY week_start DESC
  LIMIT 1;
  
  -- Fallback to base price if no data found
  IF current_price IS NULL THEN
    current_price := 100.00;
  END IF;
  
  RETURN current_price;
END;
$$;

-- Function to get price history and trends
CREATE OR REPLACE FUNCTION get_price_history(limit_count integer DEFAULT 10)
RETURNS TABLE(
  week_start date,
  price numeric,
  percentage_change numeric,
  previous_price numeric,
  price_change numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.week_start,
    wp.price,
    wp.percentage_change,
    wp.previous_price,
    (wp.price - wp.previous_price) as price_change,
    wp.created_at
  FROM weekly_prices wp
  ORDER BY wp.week_start DESC
  LIMIT limit_count;
END;
$$;
