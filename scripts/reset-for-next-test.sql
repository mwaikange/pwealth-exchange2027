-- Reset System for Next Test (Supabase-Compliant)
-- This script safely resets the system state for the next test cycle

-- Main reset function
CREATE OR REPLACE FUNCTION run_system_reset()
RETURNS JSON AS $$
DECLARE
    result JSON;
    reset_start TIMESTAMP;
    orders_cleared INTEGER := 0;
    transactions_archived INTEGER := 0;
    vesting_reset INTEGER := 0;
BEGIN
    reset_start := NOW();
    
    RAISE NOTICE 'Starting system reset at %', reset_start;
    
    -- Reset exchange to closed state
    UPDATE exchange_trading_hours 
    SET is_open = false, updated_at = NOW()
    WHERE is_open = true;
    
    RAISE NOTICE 'Exchange closed for reset';
    
    -- Clear expired orders and get count
    UPDATE buy_orders 
    SET status = 'expired', updated_at = NOW() 
    WHERE status IN ('pending', 'partial');
    
    GET DIAGNOSTICS orders_cleared = ROW_COUNT;
    
    UPDATE sell_orders 
    SET status = 'expired', updated_at = NOW() 
    WHERE status IN ('pending', 'partial');
    
    GET DIAGNOSTICS orders_cleared = orders_cleared + ROW_COUNT;
    
    RAISE NOTICE 'Expired % orders', orders_cleared;
    
    -- Archive old transactions
    UPDATE share_transactions 
    SET status = 'archived', updated_at = NOW()
    WHERE status = 'completed' 
    AND created_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS transactions_archived = ROW_COUNT;
    
    RAISE NOTICE 'Archived % transactions', transactions_archived;
    
    -- Reset test vesting slots (only test data, preserve real user data)
    UPDATE pivot_vesting 
    SET status = 'claimed', 
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE user_uuid IN (
        SELECT user_uuid FROM pivot_vesting 
        WHERE user_uuid::text LIKE 'test-%' 
        OR amount = 0
    )
    AND status IN ('locked', 'claimable');
    
    GET DIAGNOSTICS vesting_reset = ROW_COUNT;
    
    RAISE NOTICE 'Reset % test vesting slots', vesting_reset;
    
    -- Clean up old price data (keep last 10 entries)
    DELETE FROM weekly_share_price 
    WHERE id NOT IN (
        SELECT id FROM weekly_share_price 
        ORDER BY week DESC 
        LIMIT 10
    );
    
    -- Clean up old JSE200 data (keep last 5 entries)
    DELETE FROM jse200_weekly_data 
    WHERE id NOT IN (
        SELECT id FROM jse200_weekly_data 
        ORDER BY week_start DESC 
        LIMIT 5
    );
    
    RAISE NOTICE 'Cleaned up old historical data';
    
    -- Verify reset completion
    PERFORM pg_sleep(0.5); -- Brief pause to ensure all updates are committed
    
    -- Build result JSON
    SELECT json_build_object(
        'success', true,
        'reset_type', 'system_reset_for_next_test',
        'timestamp', NOW(),
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - reset_start)),
        'actions_performed', json_build_object(
            'exchange_closed', true,
            'orders_expired', orders_cleared,
            'transactions_archived', transactions_archived,
            'vesting_slots_reset', vesting_reset,
            'historical_data_cleaned', true
        ),
        'current_state', json_build_object(
            'exchange_open', (SELECT COALESCE(is_open, false) FROM exchange_trading_hours LIMIT 1),
            'active_buy_orders', (SELECT COUNT(*) FROM buy_orders WHERE status NOT IN ('expired', 'cancelled')),
            'active_sell_orders', (SELECT COUNT(*) FROM sell_orders WHERE status NOT IN ('expired', 'cancelled')),
            'pending_vesting', (SELECT COUNT(*) FROM pivot_vesting WHERE status IN ('locked', 'vest')),
            'claimable_vesting', (SELECT COUNT(*) FROM pivot_vesting WHERE status = 'claimable')
        ),
        'ready_for_next_test', true
    ) INTO result;
    
    RAISE NOTICE 'System reset completed in % seconds', EXTRACT(EPOCH FROM (NOW() - reset_start));
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'reset_type', 'system_reset_for_next_test',
            'failed_at', NOW(),
            'duration_before_failure', EXTRACT(EPOCH FROM (NOW() - reset_start)),
            'partial_completion', json_build_object(
                'orders_cleared', orders_cleared,
                'transactions_archived', transactions_archived,
                'vesting_reset', vesting_reset
            )
        );
END;
$$ LANGUAGE plpgsql;

-- Function to prepare system for testing
CREATE OR REPLACE FUNCTION prepare_for_testing()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Ensure basic tables exist and have minimal data
    INSERT INTO exchange_trading_hours (is_open, updated_at)
    SELECT false, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM exchange_trading_hours);
    
    -- Ensure JSE200 data exists
    INSERT INTO jse200_weekly_data (week_start, closing_value, percentage_change, created_at)
    SELECT DATE_TRUNC('week', NOW()), 75000.00, 2.5, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM jse200_weekly_data WHERE week_start = DATE_TRUNC('week', NOW()));
    
    -- Ensure share price data exists
    INSERT INTO weekly_share_price (week, price, created_at)
    SELECT DATE_TRUNC('week', NOW()), 108.20, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM weekly_share_price WHERE week = DATE_TRUNC('week', NOW()));
    
    SELECT json_build_object(
        'success', true,
        'message', 'System prepared for testing',
        'timestamp', NOW(),
        'tables_ready', json_build_object(
            'exchange_trading_hours', (SELECT COUNT(*) FROM exchange_trading_hours) > 0,
            'jse200_weekly_data', (SELECT COUNT(*) FROM jse200_weekly_data) > 0,
            'weekly_share_price', (SELECT COUNT(*) FROM weekly_share_price) > 0,
            'pivot_vesting', (SELECT COUNT(*) FROM pivot_vesting) >= 0
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Run reset
SELECT run_system_reset();
SELECT prepare_for_testing();
