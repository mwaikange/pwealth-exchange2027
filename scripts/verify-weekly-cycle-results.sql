-- Verify Weekly Cycle Results (Supabase-Compliant)
-- This script verifies the results of the weekly cycle simulation

-- Main verification function
CREATE OR REPLACE FUNCTION run_weekly_cycle_verification()
RETURNS JSON AS $$
DECLARE
    result JSON;
    verification_start TIMESTAMP;
    share_price_data JSON;
    exchange_data JSON;
    vesting_data JSON;
    order_data JSON;
    system_health JSON;
BEGIN
    verification_start := NOW();
    
    RAISE NOTICE 'Starting weekly cycle verification at %', verification_start;
    
    -- Verify share price calculation
    SELECT json_build_object(
        'current_price', COALESCE((SELECT price FROM weekly_share_price ORDER BY week DESC LIMIT 1), 0),
        'price_history_count', (SELECT COUNT(*) FROM weekly_share_price),
        'latest_calculation', (SELECT created_at FROM weekly_share_price ORDER BY week DESC LIMIT 1),
        'jse200_data_available', (SELECT COUNT(*) FROM jse200_weekly_data) > 0
    ) INTO share_price_data;
    
    RAISE NOTICE 'Share price verification: Current price %', (share_price_data->>'current_price')::NUMERIC;
    
    -- Verify exchange status
    SELECT json_build_object(
        'is_open', COALESCE((SELECT is_open FROM exchange_trading_hours LIMIT 1), false),
        'last_updated', (SELECT updated_at FROM exchange_trading_hours LIMIT 1),
        'trading_hours_configured', (SELECT COUNT(*) FROM exchange_trading_hours) > 0
    ) INTO exchange_data;
    
    RAISE NOTICE 'Exchange status: %', CASE WHEN (exchange_data->>'is_open')::BOOLEAN THEN 'OPEN' ELSE 'CLOSED' END;
    
    -- Verify vesting system
    SELECT json_build_object(
        'total_slots', (SELECT COUNT(*) FROM pivot_vesting),
        'locked_slots', (SELECT COUNT(*) FROM pivot_vesting WHERE status = 'locked'),
        'claimable_slots', (SELECT COUNT(*) FROM pivot_vesting WHERE status = 'claimable'),
        'claimed_slots', (SELECT COUNT(*) FROM pivot_vesting WHERE status = 'claimed'),
        'empty_slots', (SELECT COUNT(*) FROM pivot_vesting WHERE status IS NULL OR amount = 0)
    ) INTO vesting_data;
    
    RAISE NOTICE 'Vesting verification: % total slots, % claimable', 
        (vesting_data->>'total_slots')::INTEGER,
        (vesting_data->>'claimable_slots')::INTEGER;
    
    -- Verify order system
    SELECT json_build_object(
        'active_buy_orders', (SELECT COUNT(*) FROM buy_orders WHERE status NOT IN ('expired', 'cancelled')),
        'active_sell_orders', (SELECT COUNT(*) FROM sell_orders WHERE status NOT IN ('expired', 'cancelled')),
        'expired_buy_orders', (SELECT COUNT(*) FROM buy_orders WHERE status = 'expired'),
        'expired_sell_orders', (SELECT COUNT(*) FROM sell_orders WHERE status = 'expired'),
        'total_transactions', (SELECT COUNT(*) FROM share_transactions)
    ) INTO order_data;
    
    RAISE NOTICE 'Order verification: % active buy orders, % active sell orders',
        (order_data->>'active_buy_orders')::INTEGER,
        (order_data->>'active_sell_orders')::INTEGER;
    
    -- Overall system health check
    SELECT json_build_object(
        'database_responsive', true,
        'all_tables_accessible', (
            SELECT COUNT(*) = 6 FROM (
                SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_share_price'
                UNION SELECT 1 FROM information_schema.tables WHERE table_name = 'exchange_trading_hours'
                UNION SELECT 1 FROM information_schema.tables WHERE table_name = 'pivot_vesting'
                UNION SELECT 1 FROM information_schema.tables WHERE table_name = 'buy_orders'
                UNION SELECT 1 FROM information_schema.tables WHERE table_name = 'sell_orders'
                UNION SELECT 1 FROM information_schema.tables WHERE table_name = 'share_transactions'
            ) t
        ),
        'functions_available', (
            SELECT COUNT(*) >= 3 FROM information_schema.routines 
            WHERE routine_name IN ('calculate_weekly_share_price', 'vest_shares', 'claim_shares')
        ),
        'verification_timestamp', NOW(),
        'verification_duration_ms', EXTRACT(MILLISECONDS FROM (NOW() - verification_start))
    ) INTO system_health;
    
    -- Build comprehensive result
    SELECT json_build_object(
        'success', true,
        'verification_type', 'weekly_cycle_results',
        'timestamp', NOW(),
        'duration_ms', EXTRACT(MILLISECONDS FROM (NOW() - verification_start)),
        'share_price_system', share_price_data,
        'exchange_system', exchange_data,
        'vesting_system', vesting_data,
        'order_system', order_data,
        'system_health', system_health,
        'overall_status', CASE 
            WHEN (share_price_data->>'current_price')::NUMERIC > 0 
            AND (system_health->>'all_tables_accessible')::BOOLEAN 
            AND (system_health->>'functions_available')::BOOLEAN
            THEN 'HEALTHY'
            ELSE 'NEEDS_ATTENTION'
        END,
        'recommendations', CASE
            WHEN (share_price_data->>'current_price')::NUMERIC = 0 THEN ARRAY['Run price calculation']
            WHEN NOT (exchange_data->>'is_open')::BOOLEAN THEN ARRAY['Open exchange for trading']
            WHEN (vesting_data->>'claimable_slots')::INTEGER = 0 THEN ARRAY['Check vesting schedules']
            ELSE ARRAY['System operating normally']
        END
    ) INTO result;
    
    RAISE NOTICE 'Verification completed. Overall status: %', (result->>'overall_status');
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'verification_type', 'weekly_cycle_results',
            'failed_at', NOW(),
            'partial_results', json_build_object(
                'share_price_data', share_price_data,
                'exchange_data', exchange_data,
                'vesting_data', vesting_data,
                'order_data', order_data
            )
        );
END;
$$ LANGUAGE plpgsql;

-- Quick status check function
CREATE OR REPLACE FUNCTION quick_system_check()
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'timestamp', NOW(),
        'share_price', (SELECT price FROM weekly_share_price ORDER BY week DESC LIMIT 1),
        'exchange_open', (SELECT is_open FROM exchange_trading_hours LIMIT 1),
        'vesting_claimable', (SELECT COUNT(*) FROM pivot_vesting WHERE status = 'claimable'),
        'active_orders', (SELECT COUNT(*) FROM buy_orders WHERE status = 'pending') + (SELECT COUNT(*) FROM sell_orders WHERE status = 'pending')
    );
END;
$$ LANGUAGE plpgsql;

-- Run verification
SELECT run_weekly_cycle_verification();
SELECT quick_system_check();
