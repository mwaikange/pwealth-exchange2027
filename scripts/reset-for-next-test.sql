-- Reset system for next test with proper Supabase compliance
-- This script creates a function to safely reset the system state

CREATE OR REPLACE FUNCTION run_system_reset()
RETURNS JSON AS $$
DECLARE
    result JSON;
    reset_time TIMESTAMPTZ;
    orders_reset INTEGER := 0;
    transactions_archived INTEGER := 0;
BEGIN
    reset_time := NOW();
    RAISE NOTICE 'Starting system reset at: %', reset_time;
    
    -- Reset order statuses (don't delete, just expire old ones)
    UPDATE buy_orders 
    SET status = 'expired', updated_at = NOW()
    WHERE status IN ('pending', 'partially_filled')
    AND created_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS orders_reset = ROW_COUNT;
    
    UPDATE sell_orders 
    SET status = 'expired', updated_at = NOW()
    WHERE status IN ('pending', 'partially_filled')
    AND created_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS orders_reset = orders_reset + ROW_COUNT;
    
    RAISE NOTICE 'Expired % old orders', orders_reset;
    
    -- Archive old transactions
    UPDATE share_transactions 
    SET description = 'RESET_ARCHIVED: ' || description,
        updated_at = NOW()
    WHERE created_at < NOW() - INTERVAL '2 hours'
    AND description NOT LIKE 'RESET_ARCHIVED: %%'
    AND description NOT LIKE 'ARCHIVED: %%';
    
    GET DIAGNOSTICS transactions_archived = ROW_COUNT;
    
    RAISE NOTICE 'Archived % old transactions', transactions_archived;
    
    -- Reset exchange to open state
    UPDATE exchange_trading_hours 
    SET is_open = true,
        last_updated = NOW()
    WHERE id = 1;
    
    -- Clean up old status logs (keep last 10)
    DELETE FROM exchange_status_log 
    WHERE id NOT IN (
        SELECT id FROM exchange_status_log 
        ORDER BY created_at DESC 
        LIMIT 10
    );
    
    -- Reset any test vesting slots older than 1 hour
    UPDATE pivot_vesting 
    SET status = 'claimed',
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE status IN ('locked', 'vest')
    AND created_at < NOW() - INTERVAL '1 hour'
    AND user_uuid = '00000000-0000-0000-0000-000000000001'; -- Only test user
    
    RAISE NOTICE 'System reset completed successfully';
    
    SELECT json_build_object(
        'success', true,
        'message', 'System reset completed successfully',
        'reset_time', reset_time,
        'data', json_build_object(
            'orders_expired', orders_reset,
            'transactions_archived', transactions_archived,
            'exchange_reopened', true,
            'test_vesting_cleared', true,
            'duration_seconds', EXTRACT(EPOCH FROM (NOW() - reset_time))
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error in system reset: ' || SQLERRM,
            'reset_time', reset_time
        );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION run_system_reset() TO authenticated;

-- Test the function
SELECT run_system_reset();
