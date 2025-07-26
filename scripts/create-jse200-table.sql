-- Create JSE200_PriceUpdate_Mondays table if it doesn't exist
CREATE TABLE IF NOT EXISTS JSE200_PriceUpdate_Mondays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start date NOT NULL,
    update_time timestamptz NOT NULL,
    price_value numeric NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    -- Ensure unique entries per week and update time
    UNIQUE(week_start, update_time)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jse200_week_start ON JSE200_PriceUpdate_Mondays(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_jse200_update_time ON JSE200_PriceUpdate_Mondays(update_time DESC);

-- Enable RLS
ALTER TABLE JSE200_PriceUpdate_Mondays ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view JSE200 prices" ON JSE200_PriceUpdate_Mondays
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to insert/update
CREATE POLICY "Service role can manage JSE200 prices" ON JSE200_PriceUpdate_Mondays
    FOR ALL USING (auth.role() = 'service_role');

-- Insert sample data for testing (current Monday at 09:00)
INSERT INTO JSE200_PriceUpdate_Mondays (week_start, update_time, price_value)
VALUES (
    date_trunc('week', CURRENT_DATE)::date,
    date_trunc('week', CURRENT_DATE)::date + INTERVAL '9 hours',
    125.50
) ON CONFLICT (week_start, update_time) DO NOTHING;

-- Insert sample data for previous Monday
INSERT INTO JSE200_PriceUpdate_Mondays (week_start, update_time, price_value)
VALUES (
    (date_trunc('week', CURRENT_DATE)::date - INTERVAL '7 days'),
    (date_trunc('week', CURRENT_DATE)::date - INTERVAL '7 days') + INTERVAL '9 hours',
    123.75
) ON CONFLICT (week_start, update_time) DO NOTHING;
