-- Recreate the user_order_history view with proper structure
-- This combines both buy_orders and sell_orders into a unified view

DROP VIEW IF EXISTS user_order_history;

CREATE VIEW user_order_history AS
-- Buy orders
SELECT 
    'buy' as order_type,
    id,
    user_uuid,
    shares_requested as shares,
    shares_filled,
    total_amount,
    amount_filled,
    price_per_share,
    status::text as status,  -- Cast enum back to text for view compatibility
    created_at,
    updated_at,
    NULL as expires_at  -- Buy orders don't have expiration
FROM buy_orders

UNION ALL

-- Sell orders  
SELECT 
    'sell' as order_type,
    id,
    user_uuid,
    shares_available as shares,
    (shares_available - shares_remaining) as shares_filled,
    (shares_available * price_per_share) as total_amount,
    ((shares_available - shares_remaining) * price_per_share) as amount_filled,
    price_per_share,
    status::text as status,  -- Cast enum back to text for view compatibility
    created_at,
    updated_at,
    expires_at
FROM sell_orders;
