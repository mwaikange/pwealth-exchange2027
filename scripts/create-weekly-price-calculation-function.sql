-- Function to calculate weekly share price based on JSE200 percentage change
-- Updated to use actual column names: week_start_date, percent_change, effective_date, final_price
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
  
  -- Get the most recent JSE200 data using actual column names
  SELECT * INTO latest_jse_data
  FROM JSE200_PriceUpdate_Mondays
  ORDER BY created_at DESC, week_start_date DESC
  LIMIT 1;
  
  -- Check if we have JSE200 data
  IF latest_jse_data IS NULL THEN
    RAISE EXCEPTION 'No JSE200 data found for price calculation';
  END IF;
  
  -- Check if percent_change is null
  IF latest_jse_data.percent_change IS NULL THEN
    RAISE EXCEPTION 'JSE200 percent_change is null for date %', latest_jse_data.week_start_date;
  END IF;
  
  -- Get the last price from weekly_prices table using actual column names
  SELECT * INTO last_price_data
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Use base price of N$100 if no previous price exists
  IF last_price_data IS NULL OR last_price_data.final_price IS NULL THEN
    last_price_data.final_price := 100.00;
  END IF;
  
  -- Calculate new price: last_price × (1 + (percent_change / 100))
  new_price := last_price_data.final_price * (1 + (latest_jse_data.percent_change / 100));
  
  -- Round to 2 decimal places
  new_price := ROUND(new_price, 2);
  
  -- Insert or update the weekly price using actual column names
  INSERT INTO weekly_prices (
    effective_date, 
    base_price, 
    j200_growth, 
    hodl_percentage, 
    final_price, 
    price_change
  )
  VALUES (
    current_monday,
    last_price_data.final_price, -- Previous price becomes base_price
    latest_jse_data.percent_change, -- Store JSE200 growth in j200_growth
    COALESCE(last_price_data.hodl_percentage, 50.00), -- Keep previous HODL % or default
    new_price, -- New calculated price
    (new_price - last_price_data.final_price) -- Price change amount
  )
  ON CONFLICT (effective_date) 
  DO UPDATE SET 
    base_price = EXCLUDED.base_price,
    j200_growth = EXCLUDED.j200_growth,
    hodl_percentage = EXCLUDED.hodl_percentage,
    final_price = EXCLUDED.final_price,
    price_change = EXCLUDED.price_change,
    created_at = now();
  
  -- Prepare result
  calculation_result := json_build_object(
    'success', true,
    'current_monday', current_monday,
    'previous_price', last_price_data.final_price,
    'percent_change', latest_jse_data.percent_change,
    'new_price', new_price,
    'price_change_amount', (new_price - last_price_data.final_price),
    'calculation', format('%s × (1 + %s/100) = %s', 
                         last_price_data.final_price, 
                         latest_jse_data.percent_change, 
                         new_price),
    'jse200_date', latest_jse_data.week_start_date,
    'updated_at', now()
  );
  
  RETURN calculation_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'current_monday', current_monday,
      'latest_jse_data', row_to_json(latest_jse_data),
      'last_price_data', row_to_json(last_price_data)
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

-- Update the existing get_current_share_price function to use weekly_prices.final_price
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_price numeric;
BEGIN
  -- Get the most recent price from weekly_prices table using final_price column
  SELECT final_price INTO current_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Fallback to base price if no data found
  IF current_price IS NULL THEN
    current_price := 100.00;
  END IF;
  
  RETURN current_price;
END;
$$;

-- Function to get price history and trends using actual column names
CREATE OR REPLACE FUNCTION get_price_history(limit_count integer DEFAULT 10)
RETURNS TABLE(
  effective_date date,
  base_price numeric,
  j200_growth numeric,
  hodl_percentage numeric,
  final_price numeric,
  price_change numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.effective_date,
    wp.base_price,
    wp.j200_growth,
    wp.hodl_percentage,
    wp.final_price,
    wp.price_change,
    wp.created_at
  FROM weekly_prices wp
  ORDER BY wp.effective_date DESC
  LIMIT limit_count;
END;
$$;

-- Function to get JSE200 data history
CREATE OR REPLACE FUNCTION get_jse200_history(limit_count integer DEFAULT 10)
RETURNS TABLE(
  week_start_date date,
  price numeric,
  percent_change numeric,
  day_of_week text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jse.week_start_date,
    jse.price,
    jse.percent_change,
    jse.day_of_week,
    jse.created_at
  FROM JSE200_PriceUpdate_Mondays jse
  ORDER BY jse.week_start_date DESC
  LIMIT limit_count;
END;
$$;
