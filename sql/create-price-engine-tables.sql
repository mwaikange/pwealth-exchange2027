-- Create daily HODL metrics table
CREATE TABLE IF NOT EXISTS daily_hodl_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,
  total_shares numeric NOT NULL DEFAULT 0,
  shares_on_sale numeric NOT NULL DEFAULT 0,
  hodl_percentage numeric NOT NULL DEFAULT 0,
  j200_index numeric DEFAULT 100.00, -- J200 index value for reference
  created_at timestamptz DEFAULT now()
);

-- Create weekly prices table
CREATE TABLE IF NOT EXISTS weekly_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date date NOT NULL UNIQUE, -- Monday of the week
  base_price numeric NOT NULL,         -- Previous week's final price
  j200_growth numeric NOT NULL DEFAULT 0, -- J200 growth percentage
  hodl_percentage numeric NOT NULL,    -- 7-day average HODL%
  final_price numeric NOT NULL,        -- Calculated final price
  price_change numeric NOT NULL DEFAULT 0, -- Change from previous week
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_hodl_metrics_date ON daily_hodl_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_prices_date ON weekly_prices(effective_date DESC);

-- Enable RLS
ALTER TABLE daily_hodl_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read-only for authenticated users)
CREATE POLICY "Users can view daily HODL metrics" ON daily_hodl_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view weekly prices" ON weekly_prices
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert initial data
INSERT INTO weekly_prices (
  effective_date, 
  base_price, 
  j200_growth, 
  hodl_percentage, 
  final_price,
  price_change
) VALUES (
  date_trunc('week', CURRENT_DATE)::date, -- This Monday
  100.00, -- Initial base price
  0.015, -- 1.5% J200 growth
  75.5, -- Initial HODL percentage
  108.2, -- Current calculated price
  8.2 -- Initial price change
) ON CONFLICT (effective_date) DO NOTHING;

-- Insert sample daily HODL metrics for the past week
INSERT INTO daily_hodl_metrics (metric_date, total_shares, shares_on_sale, hodl_percentage, j200_index)
VALUES 
  (CURRENT_DATE - INTERVAL '7 days', 1000000, 250000, 75.0, 98.5),
  (CURRENT_DATE - INTERVAL '6 days', 1000000, 240000, 76.0, 99.1),
  (CURRENT_DATE - INTERVAL '5 days', 1000000, 245000, 75.5, 99.8),
  (CURRENT_DATE - INTERVAL '4 days', 1000000, 235000, 76.5, 100.2),
  (CURRENT_DATE - INTERVAL '3 days', 1000000, 255000, 74.5, 100.8),
  (CURRENT_DATE - INTERVAL '2 days', 1000000, 250000, 75.0, 101.1),
  (CURRENT_DATE - INTERVAL '1 day', 1000000, 248000, 75.2, 101.5)
ON CONFLICT (metric_date) DO NOTHING;
