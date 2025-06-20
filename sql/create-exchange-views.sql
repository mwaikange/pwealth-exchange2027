-- Views for exchange system monitoring and user interfaces
-- Run this after creating tables and functions

-- View for active sell orders (public order book)
CREATE OR REPLACE VIEW active_sell_orders AS
SELECT 
    so.id,
    so.shares_remaining,
    so.price_per_share,
    so.total_amount,
    so.created_at,
    so.expires_at,
    u.email as seller_email
FROM sell_orders so
LEFT JOIN auth.users u ON so.user_uuid = u.id
WHERE so.status = 'available' 
AND so.shares_remaining > 0
AND so.expires_at > NOW()
ORDER BY so.created_at ASC; -- FIFO order

-- View for user's order history
CREATE OR REPLACE VIEW user_order_history AS
SELECT 
    'buy' as order_type,
    bo.id,
    bo.user_uuid,
    bo.shares_requested as shares,
    bo.shares_filled,
    bo.total_amount,
    bo.amount_filled,
    bo.price_per_share,
    bo.status,
    bo.created_at,
    bo.updated_at,
    NULL as expires_at
FROM buy_orders bo
UNION ALL
SELECT 
    'sell' as order_type,
    so.id,
    so.user_uuid,
    so.shares_available as shares,
    (so.shares_available - so.shares_remaining) as shares_filled,
    so.total_amount,
    (so.shares_available - so.shares_remaining) * so.price_per_share as amount_filled,
    so.price_per_share,
    so.status,
    so.created_at,
    so.updated_at,
    so.expires_at
FROM sell_orders so
ORDER BY created_at DESC;

-- View for recent matches
CREATE OR REPLACE VIEW recent_matches AS
SELECT 
    mo.id,
    mo.shares_matched,
    mo.price_per_share,
    mo.total_amount,
    mo.matched_at,
    buyer.email as buyer_email,
    seller.email as seller_email,
    bo.created_at as buy_order_created,
    so.created_at as sell_order_created
FROM matched_orders mo
LEFT JOIN auth.users buyer ON mo.buyer_uuid = buyer.id
LEFT JOIN auth.users seller ON mo.seller_uuid = seller.id
LEFT JOIN buy_orders bo ON mo.buy_order_id = bo.id
LEFT JOIN sell_orders so ON mo.sell_order_id = so.id
ORDER BY mo.matched_at DESC;

-- View for exchange statistics
CREATE OR REPLACE VIEW exchange_statistics AS
SELECT 
    -- Current market data
    get_current_share_price() as current_price,
    get_current_hodl_percentage() as hodl_percentage,
    
    -- Active orders
    (SELECT COUNT(*) FROM sell_orders WHERE status = 'available' AND expires_at > NOW()) as active_sell_orders,
    (SELECT COALESCE(SUM(shares_remaining), 0) FROM sell_orders WHERE status = 'available' AND expires_at > NOW()) as shares_for_sale,
    
    -- Today's activity
    (SELECT COUNT(*) FROM matched_orders WHERE DATE(matched_at) = CURRENT_DATE) as matches_today,
    (SELECT COALESCE(SUM(shares_matched), 0) FROM matched_orders WHERE DATE(matched_at) = CURRENT_DATE) as shares_traded_today,
    (SELECT COALESCE(SUM(total_amount), 0) FROM matched_orders WHERE DATE(matched_at) = CURRENT_DATE) as volume_today,
    
    -- All-time stats
    (SELECT COUNT(*) FROM matched_orders) as total_matches,
    (SELECT COALESCE(SUM(shares_matched), 0) FROM matched_orders) as total_shares_traded,
    (SELECT COALESCE(SUM(total_amount), 0) FROM matched_orders) as total_volume;

-- View for user's current positions
CREATE OR REPLACE VIEW user_positions AS
SELECT 
    us.user_uuid,
    u.email,
    COALESCE(SUM(CASE WHEN us.wallet_type = 'buy_wallet' THEN us.shares END), 0) as buy_wallet_nad,
    COALESCE(SUM(CASE WHEN us.wallet_type = 'hold_pre' THEN us.shares END), 0) as hold_pre_shares,
    COALESCE(SUM(CASE WHEN us.wallet_type = 'hold_post' THEN us.shares END), 0) as hold_post_shares,
    COALESCE(SUM(CASE WHEN us.wallet_type = 'cashout_wallet' THEN us.shares END), 0) as cashout_wallet_nad,
    
    -- Calculate total value
    (COALESCE(SUM(CASE WHEN us.wallet_type = 'hold_pre' THEN us.shares END), 0) + 
     COALESCE(SUM(CASE WHEN us.wallet_type = 'hold_post' THEN us.shares END), 0)) * get_current_share_price() as total_share_value,
    
    COALESCE(SUM(CASE WHEN us.wallet_type = 'buy_wallet' THEN us.shares END), 0) + 
    COALESCE(SUM(CASE WHEN us.wallet_type = 'cashout_wallet' THEN us.shares END), 0) as total_nad_value
FROM user_shares us
LEFT JOIN auth.users u ON us.user_uuid = u.id
GROUP BY us.user_uuid, u.email;
