-- Verify that order data is properly backfilled and ready for display
-- Run this to check the current state of your orders

-- Check buy_orders structure and data
SELECT 
    'buy_orders' as table_name,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_orders,
    COUNT(CASE WHEN status = 'filled' THEN 1 END) as filled_orders,
    COUNT(CASE WHEN shares_requested > 0 THEN 1 END) as orders_with_shares_requested,
    COUNT(CASE WHEN amount_filled > 0 THEN 1 END) as orders_with_amount_filled
FROM buy_orders;

-- Check sell_orders structure and data
SELECT 
    'sell_orders' as table_name,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'available' THEN 1 END) as available_orders,
    COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
    COUNT(CASE WHEN shares_remaining > 0 THEN 1 END) as orders_with_shares_remaining
FROM sell_orders;

-- Sample buy orders data
SELECT 
    id,
    user_uuid,
    total_amount,
    price_per_share,
    shares_requested,
    shares_filled,
    amount_filled,
    status,
    created_at
FROM buy_orders 
ORDER BY created_at DESC 
LIMIT 5;

-- Sample sell orders data
SELECT 
    id,
    user_uuid,
    shares_available,
    shares_remaining,
    price_per_share,
    status,
    created_at
FROM sell_orders 
ORDER BY created_at DESC 
LIMIT 5;
