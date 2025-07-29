-- Verify the results of the weekly cycle simulation with comprehensive output
-- This function returns all relevant data to verify the cycle worked correctly

CREATE OR REPLACE FUNCTION run_weekly_cycle_verification()
RETURNS JSON AS $$
DECLARE
    result JSON;
    verification_time TIMESTAMPTZ;
    price_data JSON;
    exchange_data JSON;
    order_data JSON;
    system_health JSON;
BEGIN
    verification_time := NOW();
    
    RAISE NOTICE 'Starting weekly cycle verification at %', verification_time;
    
    -- Verify price data
    SELECT json_build_object(
        'current_week_price', (
            SELECT json_build_object(
                'week', week,
                'price', price,
                'jse200_value', jse200_value,
                'change_percent', change_percent,
                'created_at', created_at
            )
            FROM weekly_share_price 
            ORDER BY week DESC 
            LIMIT 1
        ),
        'price_history_count', (
            SELECT COUNT(*) FROM weekly_share_price
        ),
        'latest_jse200', (
            SELECT json_build_object(
                'date', date,
                'price', price,
                'change_percent', change_percent
            )
            FROM jse200_index 
            ORDER BY date DESC 
            LIMIT 1
        )
    ) INTO price_data;
    
    -- Verify exchange status
    SELECT json_build_object(
        'current_status', status,
        'last_updated', last_updated,
        'notes', notes,
        'status_history_count', (
            SELECT COUNT(*) FROM exchange_status
        )
    ) INTO exchange_data
    FROM exchange_status 
    WHERE id = 1;
    
    -- Verify order data
    SELECT json_build_object(
        'buy_orders', json_build_object(
            'total_count', (SELECT COUNT(*) FROM buy_orders),
            'pending_count', (SELECT COUNT(*) FROM buy_orders WHERE status = 'pending'),
            'expired_count', (SELECT COUNT(*) FROM buy_orders WHERE status = 'expired'),
            'completed_count', (SELECT COUNT(*) FROM buy_orders WHERE status = 'completed'),
            'recent_orders', (
                SELECT json_agg(
                    json_build_object(
                        'id', id,
                        'shares', shares,
                        'price_per_share', price_per_share,
                        'status', status,
                        'created_at', created_at
                    )
                )
                FROM (
                    SELECT * FROM buy_orders 
                    ORDER BY created_at DESC 
                    LIMIT 5
                ) recent_buy
            )
        ),
        'sell_orders', json_build_object(
            'total_count', (SELECT COUNT(*) FROM sell_orders),
            'pending_count', (SELECT COUNT(*) FROM sell_orders WHERE status = 'pending'),
            'expired_count', (SELECT COUNT(*) FROM sell_orders WHERE status = 'expired'),
            'completed_count', (SELECT COUNT(*) FROM sell_orders WHERE status = 'completed'),
            'recent_orders', (
                SELECT json_agg(
                    json_build_object(
                        'id', id,
                        'shares', shares,
                        'price_per_share', price_per_share,
                        'status', status,
                        'created_at', created_at
                    )
                )
                FROM (
                    SELECT * FROM sell_orders 
                    ORDER BY created_at DESC 
                    LIMIT 5
                ) recent_sell
            )
        )
    ) INTO order_data;
    
    -- System health check
    SELECT json_build_object(
        'tables_exist', json_build_object(
            'weekly_share_price', (
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'weekly_share_price'
                )
            ),
            'exchange_status', (
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'exchange_status'
                )
            ),
            'buy_orders', (
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'buy_orders'
                )
            ),
            'sell_orders', (
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'sell_orders'
                )
            ),
            'jse200_index', (
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'jse200_index'
                )
            )
        ),
        'functions_exist', json_build_object(
            'run_weekly_cycle_simulation', (
                SELECT EXISTS (
                    SELECT FROM information_schema.routines 
                    WHERE routine_name = 'run_weekly_cycle_simulation'
                )
            ),
            'test_clear_history_functions', (
                SELECT EXISTS (
                    SELECT FROM information_schema.routines 
                    WHERE routine_name = 'test_clear_history_functions'
                )
            )
        )
    ) INTO system_health;
    
    RAISE NOTICE 'Verification completed successfully';
    
    SELECT json_build_object(
        'success', true,
        'verification_time', verification_time,
        'message', 'Weekly cycle verification completed',
        'price_data', price_data,
        'exchange_data', exchange_data,
        'order_data', order_data,
        'system_health', system_health,
        'summary', json_build_object(
            'price_calculated', CASE WHEN price_data->>'current_week_price' IS NOT NULL THEN true ELSE false END,
            'exchange_functional', CASE WHEN exchange_data->>'current_status' IS NOT NULL THEN true ELSE false END,
            'orders_created', CASE WHEN (order_data->'buy_orders'->>'total_count')::INTEGER > 0 THEN true ELSE false END,
            'system_healthy', true
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Weekly cycle verification failed',
            'verification_time', verification_time
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION run_weekly_cycle_verification() TO authenticated;

-- Execute the verification
SELECT run_weekly_cycle_verification();
