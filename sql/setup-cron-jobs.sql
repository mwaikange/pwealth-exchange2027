-- Setup CRON jobs for automated price calculations
-- Note: This requires pg_cron extension to be enabled in Supabase

-- Enable the pg_cron extension (run as superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily HODL snapshot job (runs every day at 23:00 UTC)
-- SELECT cron.schedule(
--     'daily-hodl-snapshot',
--     '0 23 * * *',
--     'SELECT calculate_daily_hodl_snapshot();'
-- );

-- Weekly price calculation job (runs every Monday at 09:00 UTC)
-- SELECT cron.schedule(
--     'weekly-price-calculation',
--     '0 9 * * 1',
--     'SELECT calculate_weekly_share_price(100.00);'
-- );

-- Alternative: Use Supabase Edge Functions with external CRON service
-- Call these URLs on schedule:
-- Daily: POST https://your-project.supabase.co/functions/v1/weekly-price-cron
--        Body: {"action": "daily_hodl_snapshot"}
-- Weekly: POST https://your-project.supabase.co/functions/v1/weekly-price-cron
--         Body: {"action": "weekly_price_calculation", "pegPrice": 100.00}

-- Manual execution examples:
-- SELECT calculate_daily_hodl_snapshot();
-- SELECT calculate_weekly_share_price(100.00);

-- View current pricing data:
-- SELECT * FROM get_pricing_history(30);
-- SELECT get_current_share_price();
-- SELECT get_current_hodl_percentage();
