-- Create weekly share prices table
CREATE TABLE IF NOT EXISTS weekly_share_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL, -- Monday date
  peg_price numeric NOT NULL, -- J200 index value or base price
  average_hodl_percentage numeric NOT NULL, -- from past 7 days
  calculated_price numeric NOT NULL, -- final result used in exchange
  created_at timestamptz DEFAULT now(),
  
  -- Ensure one record per week
  UNIQUE(week_start)
);

-- Create daily HODL snapshots table
CREATE TABLE IF NOT EXISTS daily_hodl_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL, -- should run daily
  shares_total numeric NOT NULL,
  shares_listed_for_sale numeric NOT NULL,
  hodl_percentage numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure one record per day
  UNIQUE(snapshot_date)
);

-- Create indexes for performance
CREATE INDEX idx_weekly_share_prices_week_start ON weekly_share_prices(week_start DESC);
CREATE INDEX idx_daily_hodl_snapshots_date ON daily_hodl_snapshots(snapshot_date DESC);

-- Enable RLS
ALTER TABLE weekly_share_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_hodl_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view weekly prices" ON weekly_share_prices
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view hodl snapshots" ON daily_hodl_snapshots
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert initial data
INSERT INTO weekly_share_prices (week_start, peg_price, average_hodl_percentage, calculated_price)
VALUES (
  date_trunc('week', CURRENT_DATE)::date, -- This Monday
  100.00, -- Base peg price
  75.5, -- Initial HODL percentage
  125.50 -- Calculated price
) ON CONFLICT (week_start) DO NOTHING;

-- Insert sample daily HODL snapshots for the past week
INSERT INTO daily_hodl_snapshots (snapshot_date, shares_total, shares_listed_for_sale, hodl_percentage)
VALUES 
  (CURRENT_DATE - INTERVAL '7 days', 1000000, 250000, 75.0),
  (CURRENT_DATE - INTERVAL '6 days', 1000000, 240000, 76.0),
  (CURRENT_DATE - INTERVAL '5 days', 1000000, 245000, 75.5),
  (CURRENT_DATE - INTERVAL '4 days', 1000000, 235000, 76.5),
  (CURRENT_DATE - INTERVAL '3 days', 1000000, 255000, 74.5),
  (CURRENT_DATE - INTERVAL '2 days', 1000000, 250000, 75.0),
  (CURRENT_DATE - INTERVAL '1 day', 1000000, 248000, 75.2)
ON CONFLICT (snapshot_date) DO NOTHING;
