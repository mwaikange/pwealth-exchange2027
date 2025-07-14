-- Backfill script to match existing unmatched orders
-- Run this after the fractional matching system is deployed

-- First, let's check the current state of orders
SELECT 
    'BEFORE BACKFILL' as phase,
    'BUY_ORDERS' as order_type,
    status,
    COUNT(*) as count,
    SUM(total_amount) as total_amount,
    SUM(COALESCE(amount_filled, 0)) as total_filled
FROM buy_orders 
GROUP BY status
UNION ALL
SELECT 
    'BEFORE BACKFILL' as phase,
    'SELL_ORDERS' as order_type,
    status,
    COUNT(*) as count,
    SUM(shares_available) as total_shares,
    SUM(shares_available - COALESCE(shares_remaining, shares_available)) as total_filled
FROM sell_orders 
GROUP BY status
ORDER BY phase, order_type, status;

-- Run the matching engine to process any existing unmatched orders
SELECT match_orders() as backfill_result;

-- Check the state after backfill
SELECT 
    'AFTER BACKFILL' as phase,
    'BUY_ORDERS' as order_type,
    status,
    COUNT(*) as count,
    SUM(total_amount) as total_amount,
    SUM(COALESCE(amount_filled, 0)) as total_filled
FROM buy_orders 
GROUP BY status
UNION ALL
SELECT 
    'AFTER BACKFILL' as phase,
    'SELL_ORDERS' as order_type,
    status,
    COUNT(*) as count,
    SUM(shares_available) as total_shares,
    SUM(shares_available - COALESCE(shares_remaining, shares_available)) as total_filled
FROM sell_orders 
GROUP BY status
ORDER BY phase, order_type, status;

-- Show recent matches made (if any)
SELECT 
    'RECENT MATCHES' as info,
    bo.buy_ref,
    so.sell_ref,
    bo.total_amount,
    bo.amount_filled,
    so.shares_available,
    so.shares_remaining,
    bo.price_per_share,
    bo.updated_at
FROM buy_orders bo
JOIN sell_orders so ON bo.price_per_share = so.price_per_share
WHERE bo.updated_at > NOW() - INTERVAL '5 minutes'
   OR so.updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY bo.updated_at DESC
LIMIT 10;
