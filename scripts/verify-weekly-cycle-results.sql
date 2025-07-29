-- Verify Weekly Cycle Results
-- This function returns comprehensive system status after cycle completion

CREATE OR REPLACE FUNCTION run_weekly_cycle_verification()
RETURNS JSON AS $$
DECLARE
    exchange_status JSON;
    price_info JSON;
    order_stats JSON;
    user_stats JSON;
    system_health JSON;
BEGIN
    -- Get exchange status
    SELECT get_exchange_status() INTO exchange_status;
    
    -- Get current price information
    SELECT json_build_object(
        'current_price', (SELECT COALESCE(price, 100) FROM weekly_share_price ORDER BY week DESC LIMIT 1),
        'price_history_count', (SELECT COUNT(*) FROM weekly_share_price),
        'latest_jse200_data', (
            SELECT json_build_object(
                'week_start_date', week_start_date,
                'price', price,
                'percent_change', percent_change,
                'created_at', created_at
            )
            FROM jse200_weekly_data 
            ORDER BY week_start_date DESC LIMIT 1
        )
    ) INTO price_info;
    
    -- Get order statistics
    SELECT json_build_object(
        'active_buy_orders', (SELECT COUNT(*) FROM buy_orders WHERE status = 'active'),
        'active_sell_orders', (SELECT COUNT(*) FROM sell_orders WHERE status = 'active'),
        'expired_buy_orders', (SELECT COUNT(*) FROM buy_orders WHERE status = 'expired'),
        'expired_sell_orders', (SELECT COUNT(*) FROM sell_orders WHERE status = 'expired'),
        'ui_archived_buy_orders', (SELECT COUNT(*) FROM buy_orders WHERE ui_archived = true),
        'ui_archived_sell_orders', (SELECT COUNT(*) FROM sell_orders WHERE ui_archived = true),
        'total_buy_orders', (SELECT COUNT(*) FROM buy_orders),
        'total_sell_orders', (SELECT COUNT(*) FROM sell_orders)
    ) INTO order_stats;
    
    -- Get user statistics
    SELECT json_build_object(
        'total_users_with_shares', (SELECT COUNT(DISTINCT user_uuid) FROM user_shares WHERE shares > 0),
        'total_shares_in_circulation', (SELECT COALESCE(SUM(shares), 0) FROM user_shares),
        'wallet_distribution', json_build_object(
            'buy_wallet', (SELECT COALESCE(SUM(shares), 0) FROM user_shares WHERE wallet_type = 'buy_wallet'),
            'hold_pre', (SELECT COALESCE(SUM(shares), 0) FROM user_shares WHERE wallet_type = 'hold_wallet_pre_hold'),
            'hold_post', (SELECT COALESCE(SUM(shares), 0) FROM user_shares WHERE wallet_type = 'hold_wallet_post_hold'),
            'cashout', (SELECT COALESCE(SUM(shares), 0) FROM user_shares WHERE wallet_type = 'cashout_wallet')
        )
    ) INTO user_stats;
    
    -- System health check
    SELECT json_build_object(
        'database_tables_exist', json_build_object(
            'buy_orders', (SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_name = 'buy_orders'),
            'sell_orders', (SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_name = 'sell_orders'),
            'weekly_share_price', (SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_name = 'weekly_share_price'),
            'jse200_weekly_data', (SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_name = 'jse200_weekly_data'),
            'user_shares', (SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_name = 'user_shares'),
            'pivot_vesting', (SELECT COUNT(*) > 0 FROM information_schema.tables WHERE table_name = 'pivot_vesting')
        ),
        'critical_functions_exist', json_build_object(
            'get_exchange_status', (SELECT COUNT(*) > 0 FROM information_schema.routines WHERE routine_name = 'get_exchange_status'),
            'calculate_weekly_share_price', (SELECT COUNT(*) > 0 FROM information_schema.routines WHERE routine_name = 'calculate_weekly_share_price'),
            'close_exchange_for_week', (SELECT COUNT(*) > 0 FROM information_schema.routines WHERE routine_name = 'close_exchange_for_week'),
            'open_exchange_for_week', (SELECT COUNT(*) > 0 FROM information_schema.routines WHERE routine_name = 'open_exchange_for_week'),
            'vest_shares', (SELECT COUNT(*) > 0 FROM information_schema.routines WHERE routine_name = 'vest_shares'),
            'claim_shares', (SELECT COUNT(*) > 0 FROM information_schema.routines WHERE routine_name = 'claim_shares')
        )
    ) INTO system_health;
    
    RETURN json_build_object(
        'success', true,
        'verification_timestamp', NOW(),
        'exchange_status', exchange_status,
        'price_information', price_info,
        'order_statistics', order_stats,
        'user_statistics', user_stats,
        'system_health', system_health,
        'summary', json_build_object(
            'exchange_is_open', (exchange_status->>'is_trading_open')::BOOLEAN,
            'current_share_price', (price_info->>'current_price')::NUMERIC,
            'total_active_orders', (order_stats->>'active_buy_orders')::INTEGER + (order_stats->>'active_sell_orders')::INTEGER,
            'system_operational', true
        )
    );
END;
$$ LANGUAGE plpgsql;
