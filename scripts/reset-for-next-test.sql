-- Reset system for next test cycle with proper Supabase compliance
-- This function cleans up test data and prepares for the next simulation

CREATE OR REPLACE FUNCTION run_system_reset()
RETURNS JSON AS $$
DECLARE
    result JSON;
    reset_time TIMESTAMPTZ;
    orders_deleted INTEGER := 0;
    prices_kept INTEGER := 0;
    transactions_archived INTEGER := 0;
BEGIN
    reset_time := NOW();
    
    RAISE NOTICE 'Starting system reset at %', reset_time;
    
    -- Reset exchange to closed state
    UPDATE exchange_status 
    SET status = 'closed',
        last_updated = NOW(),
        notes = 'Reset for next test cycle'
    WHERE id = 1;
    
    RAISE NOTICE 'Exchange status reset to closed';
    
    -- Clear test orders (keep last 24 hours for reference)
    DELETE FROM buy_orders 
    WHERE created_at < NOW() - INTERVAL '24 hours'
    AND status IN ('expired', 'cancelled');
    
    GET DIAGNOSTICS orders_deleted = ROW_COUNT;
    
    DELETE FROM sell_orders 
    WHERE created_at < NOW() - INTERVAL '24 hours'
    AND status IN ('expired', 'cancelled');
    
    GET DIAGNOSTICS orders_deleted = orders_deleted + ROW_COUNT;
    
    RAISE NOTICE 'Deleted % old test orders', orders_deleted;
    
    -- Keep recent price data (last 4 weeks)
    SELECT COUNT(*) INTO prices_kept
    FROM weekly_share_price 
    WHERE week >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '4 weeks';
    
    -- Archive old transactions
    UPDATE share_transactions 
    SET status = 'archived', updated_at = NOW()
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND status = 'completed';
    
    GET DIAGNOSTICS transactions_archived = ROW_COUNT;
    
    RAISE NOTICE 'Archived % old transactions', transactions_archived;
    
    -- Reset any pending operations
    UPDATE buy_orders 
    SET status = 'cancelled', updated_at = NOW()
    WHERE status = 'processing';
    
    UPDATE sell_orders 
    SET status = 'cancelled', updated_at = NOW()
    WHERE status = 'processing';
    
    RAISE NOTICE 'System reset completed successfully';
    
    SELECT json_build_object(
        'success', true,
        'reset_time', reset_time,
        'message', 'System reset completed successfully',
        'actions_performed', json_build_object(
            'exchange_status', 'Reset to closed',
            'orders_deleted', orders_deleted,
            'prices_kept', prices_kept,
            'transactions_archived', transactions_archived,
            'pending_operations', 'Cancelled'
        ),
        'system_ready', true,
        'next_steps', json_build_array(
            'System is ready for next test cycle',
            'Run run_weekly_cycle_simulation() to start new cycle',
            'Use run_weekly_cycle_verification() to check results'
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'System reset failed',
            'reset_time', reset_time
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION run_system_reset() TO authenticated;

-- Execute the reset
SELECT run_system_reset();
