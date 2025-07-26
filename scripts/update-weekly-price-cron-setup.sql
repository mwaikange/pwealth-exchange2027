-- Update the cron job to use the new JSE200-based function
-- This replaces any existing weekly price calculation cron jobs

-- First, remove any existing cron jobs for weekly price calculation
SELECT cron.unschedule('weekly-price-calculation');

-- Create new cron job that runs every Monday at 09:30 (30 minutes after JSE200 update)
SELECT cron.schedule(
    'weekly-price-from-jse200',
    '30 9 * * 1', -- Every Monday at 09:30
    $$SELECT set_weekly_price_from_jse200();$$
);

-- Also create a backup cron that runs every Monday at 10:00 in case the 09:30 fails
SELECT cron.schedule(
    'weekly-price-from-jse200-backup',
    '0 10 * * 1', -- Every Monday at 10:00
    $$SELECT set_weekly_price_from_jse200();$$
);

-- Create a manual trigger function for testing
CREATE OR REPLACE FUNCTION trigger_weekly_price_update()
RETURNS text AS $$
BEGIN
    PERFORM set_weekly_price_from_jse200();
    RETURN 'Weekly price update triggered successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION trigger_weekly_price_update() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_weekly_price_update() TO service_role;
