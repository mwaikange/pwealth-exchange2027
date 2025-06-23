-- Restore the JSE-based pricing system

-- 1. Create JSE index data table
CREATE TABLE IF NOT EXISTS jse_index_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  index_value NUMERIC NOT NULL,
  change_ratio NUMERIC NOT NULL, -- e.g., 1.024 for 2.4% growth
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- 2. Update weekly_share_prices table structure
ALTER TABLE weekly_share_prices 
ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS jse_factor NUMERIC,
ADD COLUMN IF NOT EXISTS hodl_factor NUMERIC;

-- 3. Create the proper weekly price calculation function
CREATE OR REPLACE FUNCTION calculate_weekly_share_price()
RETURNS VOID AS $$
DECLARE
  jse_ratio NUMERIC;
  hodl_percent NUMERIC;
  hodl_factor NUMERIC;
  calculated_price NUMERIC;
  total_hold_post NUMERIC;
  total_issued NUMERIC;
BEGIN
  -- Get 7-day average JSE Top 40 performance
  SELECT AVG(change_ratio) INTO jse_ratio 
  FROM jse_index_data
  WHERE date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- If no JSE data, use neutral factor
  IF jse_ratio IS NULL THEN
    jse_ratio := 1.0;
  END IF;

  -- Calculate HODL percentage
  SELECT COALESCE(SUM(shares), 0) INTO total_hold_post 
  FROM user_shares 
  WHERE wallet_type = 'hold_post';
  
  SELECT COALESCE(SUM(shares), 0) INTO total_issued 
  FROM user_shares;

  hodl_percent := total_hold_post / NULLIF(total_issued, 0);

  -- Convert HODL% to factor
  IF hodl_percent >= 0.8 THEN
    hodl_factor := 1.05; -- 5% bonus for high holding
  ELSIF hodl_percent >= 0.6 THEN
    hodl_factor := 1.0;  -- Neutral
  ELSE
    hodl_factor := 0.95; -- 5% penalty for low holding
  END IF;

  -- Calculate final price using the JSE formula
  calculated_price := 100 * jse_ratio * hodl_factor;

  -- Insert/Update weekly price
  INSERT INTO weekly_share_prices (
    week_start, 
    base_price, 
    peg_price,
    jse_factor, 
    hodl_factor, 
    calculated_price,
    average_hodl_percentage
  ) VALUES (
    date_trunc('week', CURRENT_DATE)::date,
    100,
    100,
    jse_ratio, 
    hodl_factor, 
    calculated_price,
    hodl_percent * 100
  )
  ON CONFLICT (week_start) 
  DO UPDATE SET
    jse_factor = EXCLUDED.jse_factor,
    hodl_factor = EXCLUDED.hodl_factor,
    calculated_price = EXCLUDED.calculated_price,
    average_hodl_percentage = EXCLUDED.average_hodl_percentage;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix the get_current_share_price function
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    -- Get the most recent calculated price
    SELECT calculated_price INTO current_price
    FROM weekly_share_prices
    ORDER BY week_start DESC
    LIMIT 1;
    
    -- If no price found, return base price
    IF current_price IS NULL THEN
        current_price := 100.00;
    END IF;
    
    RETURN current_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Insert sample JSE data for testing
INSERT INTO jse_index_data (date, index_value, change_ratio) VALUES
  (CURRENT_DATE - INTERVAL '7 days', 75000, 1.02),
  (CURRENT_DATE - INTERVAL '6 days', 76500, 1.015),
  (CURRENT_DATE - INTERVAL '5 days', 77000, 1.01),
  (CURRENT_DATE - INTERVAL '4 days', 76800, 0.998),
  (CURRENT_DATE - INTERVAL '3 days', 77200, 1.005),
  (CURRENT_DATE - INTERVAL '2 days', 77800, 1.008),
  (CURRENT_DATE - INTERVAL '1 day', 78000, 1.003)
ON CONFLICT (date) DO NOTHING;

-- 6. Run initial calculation
SELECT calculate_weekly_share_price();
