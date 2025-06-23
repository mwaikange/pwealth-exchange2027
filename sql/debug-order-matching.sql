-- Debug queries to check order matching
-- 1. Check current orders
SELECT 'BUY ORDERS' as type, id, user_uuid, total_amount, price_per_share, 
       amount_filled, shares_fulfilled, status, created_at
FROM buy_orders 
WHERE status = 'pending'
ORDER BY created_at;

SELECT 'SELL ORDERS' as type, id, user_uuid, shares_available, shares_remaining, 
       price_per_share, status, created_at
FROM sell_orders 
WHERE status = 'available'
ORDER BY created_at;

-- 2. Check if orders should match
SELECT 
    b.id as buy_id,
    s.id as sell_id,
    b.price_per_share as buy_price,
    s.price_per_share as sell_price,
    b.total_amount - COALESCE(b.amount_filled, 0) as remaining_buy_amount,
    s.shares_remaining,
    CASE 
        WHEN b.price_per_share = s.price_per_share THEN 'SHOULD MATCH'
        ELSE 'NO MATCH'
    END as match_status
FROM buy_orders b
CROSS JOIN sell_orders s
WHERE b.status = 'pending' 
AND s.status = 'available'
AND s.shares_remaining > 0
ORDER BY b.created_at, s.created_at;

-- 3. Test the matching function
SELECT test_match_orders();
