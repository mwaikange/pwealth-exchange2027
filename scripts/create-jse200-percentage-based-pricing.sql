-- Create JSE200 table with percentage_change column
CREATE TABLE IF NOT EXISTS JSE200_PriceUpdate_Mondays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  week_start date NOT NULL, -- Monday date
  percentage_change numeric NOT NULL, -- e.g., -5.32 for -5.32%
  jse200_value numeric, -- Optional: actual JSE200 index value
  created_at timestamptz DEFAULT now(),
  
  -- Ensure one record per week
  UNIQUE(week_start)
);

-- Create weekly_prices table (simplified structure)
CREATE TABLE IF NOT EXISTS weekly_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL, -- Monday date
  price numeric NOT NULL, -- The calculated share price
  percentage_change numeric, -- Store the % change used
  previous_price numeric, -- Store previous week's price for reference
  created_at timestamptz DEFAULT now(),
  
  -- Ensure one record per week
  UNIQUE(week_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jse200_week_start ON JSE200_PriceUpdate_Mondays(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_jse200_created_at ON JSE200_PriceUpdate_Mondays(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_prices_week_start ON weekly_prices(week_start DESC);

-- Enable RLS
ALTER TABLE JSE200_PriceUpdate_Mondays ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view JSE200 data" ON JSE200_PriceUpdate_Mondays
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view weekly prices" ON weekly_prices
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admin policies for inserts/updates
CREATE POLICY "Service role can manage JSE200 data" ON JSE200_PriceUpdate_Mondays
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage weekly prices" ON weekly_prices
    FOR ALL USING (auth.role() = 'service_role');

-- Insert base price (N$100) for current week if not exists
INSERT INTO weekly_prices (week_start, price, percentage_change, previous_price)
VALUES (
  date_trunc('week', CURRENT_DATE)::date, -- This Monday
  100.00, -- Base price N$100
  0.00, -- No change for base
  100.00 -- Previous same as current for base
) ON CONFLICT (week_start) DO NOTHING;

-- Insert sample JSE200 data for testing
INSERT INTO JSE200_PriceUpdate_Mondays (date, week_start, percentage_change, jse200_value)
VALUES 
  (CURRENT_DATE - INTERVAL '7 days', date_trunc('week', CURRENT_DATE - INTERVAL '7 days')::date, 2.5, 75250.00),
  (CURRENT_DATE, date_trunc('week', CURRENT_DATE)::date, -1.8, 73896.00)
ON CONFLICT (week_start) DO NOTHING;
