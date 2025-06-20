-- CRON Job Setup for Price Engine
-- Note: This requires external CRON service or Supabase scheduled functions

-- ===========================================
-- OPTION 1: External CRON Service (Recommended)
-- ===========================================

-- Set up these CRON jobs in your hosting provider or external service:

-- Daily HODL Metrics (runs every day at 23:59 UTC)
-- POST https://your-project.supabase.co/functions/v1/price-engine-cron
-- Headers: { "Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json" }
-- Body: { "action": "daily_hodl_calculation" }
-- Schedule: 59 23 * * *

-- Weekly Price Calculation (runs every Monday at 09:00 UTC)
-- POST https://your-project.supabase.co/functions/v1/price-engine-cron
-- Headers: { "Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json" }
-- Body: { "action": "weekly_price_calculation" }
-- Schedule: 0 9 * * 1

-- ===========================================
-- OPTION 2: Manual Testing Commands
-- ===========================================

-- Test daily HODL calculation:
SELECT calculate_daily_hodl_metrics();

-- Test weekly price calculation:
SELECT calculate_weekly_share_price();

-- Get current price:
SELECT get_latest_share_price();

-- Get current HODL percentage:
SELECT get_current_hodl_percentage();

-- View price history:
SELECT * FROM get_price_history(30);

-- View HODL history:
SELECT * FROM get_hodl_history(7);

-- ===========================================
-- OPTION 3: Supabase pg_cron (if available)
-- ===========================================

-- Enable pg_cron extension (requires superuser privileges)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily HODL metrics (23:59 UTC daily)
-- SELECT cron.schedule(
--     'daily-hodl-metrics',
--     '59 23 * * *',
--     'SELECT calculate_daily_hodl_metrics();'
-- );

-- Schedule weekly price calculation (09:00 UTC every Monday)
-- SELECT cron.schedule(
--     'weekly-price-calculation',
--     '0 9 * * 1',
--     'SELECT calculate_weekly_share_price();'
-- );

-- View scheduled jobs:
-- SELECT * FROM cron.job;

-- Remove a scheduled job:
-- SELECT cron.unschedule('daily-hodl-metrics');
-- SELECT cron.unschedule('weekly-price-calculation');

-- ===========================================
-- Testing & Verification
-- ===========================================

-- Check if tables have data:
SELECT COUNT(*) as daily_metrics_count FROM daily_hodl_metrics;
SELECT COUNT(*) as weekly_prices_count FROM weekly_prices;

-- View latest calculations:
SELECT * FROM daily_hodl_metrics ORDER BY metric_date DESC LIMIT 5;
SELECT * FROM weekly_prices ORDER BY effective_date DESC LIMIT 5;

-- Test the Edge Function manually:
-- curl -X POST 'https://your-project.supabase.co/functions/v1/price-engine-cron' \
--   -H 'Authorization: Bearer YOUR_ANON_KEY' \
--   -H 'Content-Type: application/json' \
--   -d '{"action": "daily_hodl_calculation"}'
