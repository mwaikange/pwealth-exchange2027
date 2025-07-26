-- Update existing JSE200_PriceUpdate_Mondays table structure (if needed)
-- The table already exists, so we'll just ensure it has the right constraints

-- Add unique constraint on week_start_date if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'JSE200_PriceUpdate_Mondays' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%week_start_date%'
    ) THEN
        ALTER TABLE JSE200_PriceUpdate_Mondays 
        ADD CONSTRAINT unique_week_start_date UNIQUE(week_start_date);
    END IF;
END $$;

-- Add unique constraint on effective_date for weekly_prices if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'weekly_prices' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%effective_date%'
    ) THEN
        ALTER TABLE weekly_prices 
        ADD CONSTRAINT unique_effective_date UNIQUE(effective_date);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jse200_week_start_date ON JSE200_PriceUpdate_Mondays(week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_jse200_created_at ON JSE200_PriceUpdate_Mondays(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_prices_effective_date ON weekly_prices(effective_date DESC);

-- Enable RLS if not already enabled
ALTER TABLE JSE200_PriceUpdate_Mondays ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_prices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Authenticated users can view JSE200 data" ON JSE200_PriceUpdate_Mondays;
DROP POLICY IF EXISTS "Authenticated users can view weekly prices" ON weekly_prices;
DROP POLICY IF EXISTS "Service role can manage JSE200 data" ON JSE200_PriceUpdate_Mondays;
DROP POLICY IF EXISTS "Service role can manage weekly prices" ON weekly_prices;

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
INSERT INTO weekly_prices (
    effective_date, 
    base_price, 
    j200_growth, 
    hodl_percentage, 
    final_price, 
    price_change
)
VALUES (
    date_trunc('week', CURRENT_DATE)::date, -- This Monday
    100.00, -- Base price N$100
    0.00, -- No J200 growth initially
    50.00, -- Default HODL percentage
    100.00, -- Final price same as base initially
    0.00 -- No price change initially
) ON CONFLICT (effective_date) DO NOTHING;

-- Insert sample JSE200 data for testing (using existing column names)
INSERT INTO JSE200_PriceUpdate_Mondays (
    week_start_date, 
    price, 
    percent_change, 
    day_of_week
)
VALUES 
    (
        date_trunc('week', CURRENT_DATE - INTERVAL '7 days')::date, 
        75250.00, 
        2.5, 
        'Monday'
    ),
    (
        date_trunc('week', CURRENT_DATE)::date, 
        73896.00, 
        -1.8, 
        'Monday'
    )
ON CONFLICT (week_start_date) DO NOTHING;
