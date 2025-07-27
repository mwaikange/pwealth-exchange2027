-- Monitor Weekly Trading System Status
-- Run this to check system health

-- 1. Check current trading status
SELECT 'Current Trading Status' as check_type;
SELECT is_trading_allowed();

-- 2. Check current week's price
SELECT 'Current Week Price' as check_type;
SELECT 
    week_start_date,
    price,
    created_at,
    CASE 
        WHEN week_start_date = date_trunc('week', CURRENT_DATE)::DATE THEN 'CURRENT WEEK'
        ELSE 'PAST WEEK'
    END as status
FROM weekly_price 
ORDER BY week_start_date DESC 
LIMIT 5;

-- 3. Check active orders
SELECT 'Active Orders Summary' as check_type;
SELECT 
    'Buy Orders' as order_type,
    status,
    COUNT(*) as count,
    SUM(total_amount) as total_amount,
    SUM(amount_filled) as amount_filled
FROM buy_orders 
WHERE status IN ('pending', 'partial')
GROUP BY status
UNION ALL
SELECT 
    'Sell Orders' as order_type,
    status,
    COUNT(*) as count,
    SUM(shares_available) as total_shares,
    SUM(shares_available - COALESCE(shares_remaining, shares_available)) as shares_filled
FROM sell_orders 
WHERE status IN ('available', 'partial')
GROUP BY status;

-- 4. Check recent matching activity
SELECT 'Recent Matching Activity' as check_type;
SELECT 
    action,
    COUNT(*) as count,
    AVG(shares_matched) as avg_shares,
    SUM(shares_matched) as total_shares
FROM order_matching_log 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action
ORDER BY count DESC;

-- 5. Check cron job status
SELECT 'Scheduled Jobs Status' as check_type;
SELECT 
    jobname,
    schedule,
    active,
    last_run,
    next_run
FROM cron.job 
WHERE jobname LIKE '%weekly%' OR jobname LIKE '%match%' OR jobname LIKE '%expire%';

-- 6. System health summary
SELECT 'System Health Summary' as check_type;
SELECT 
    json_build_object(
        'current_time', NOW(),
        'trading_allowed', (SELECT is_trading_allowed()->>'trading_allowed')::BOOLEAN,
        'current_week_price', (SELECT price FROM weekly_price WHERE week_start_date = date_trunc('week', CURRENT_DATE)::DATE),
        'active_buy_orders', (SELECT COUNT(*) FROM buy_orders WHERE status IN ('pending', 'partial')),
        'active_sell_orders', (SELECT COUNT(*) FROM sell_orders WHERE status IN ('available', 'partial')),
        'matches_today', (SELECT COUNT(*) FROM order_matching_log WHERE action = 'matched' AND created_at::DATE = CURRENT_DATE)
    ) as system_status;
