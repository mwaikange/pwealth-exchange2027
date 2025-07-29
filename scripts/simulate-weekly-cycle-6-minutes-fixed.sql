-- Simulate Weekly Cycle in 6 Minutes (Supabase-Compliant)
-- This script simulates a complete weekly trading cycle compressed into 6 minutes

-- Main simulation function
CREATE OR REPLACE FUNCTION run_weekly_cycle_simulation()
RETURNS JSON AS $$
DECLARE
    result JSON;
    start_time TIMESTAMP;
    current_price NUMERIC;
    jse200_value NUMERIC;
    simulation_steps JSON[];
    step_result JSON;
BEGIN
    start_time := NOW();
    simulation_steps := ARRAY[]::JSON[];
    
    RAISE NOTICE 'Starting 6-minute weekly cycle simulation at %', start_time;
    
    -- Step 1: Initialize JSE200 data (0-1 minute)
    RAISE NOTICE 'Step 1: Initializing JSE200 data...';
    
    -- Insert sample JSE200 data for the week
    INSERT INTO jse200_weekly_data (week_start, closing_value, percentage_change, created_at)
    VALUES 
        (DATE_TRUNC('week', NOW()), 75000.00, 2.5, NOW()),
        (DATE_TRUNC('week', NOW()) - INTERVAL '1 week', 73170.73, 1.8, NOW() - INTERVAL '1 week')
    ON CONFLICT (week_start) DO UPDATE SET
        closing_value = EXCLUDED.closing_value,
        percentage_change = EXCLUDED.percentage_change,
        updated_at = NOW();
    
    step_result := json_build_object(
        'step', 1,
        'description', 'JSE200 data initialized',
        'timestamp', NOW(),
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - start_time))
    );
    simulation_steps := array_append(simulation_steps, step_result);
    
    -- Step 2: Calculate new share price (1-2 minutes)
    RAISE NOTICE 'Step 2: Calculating new share price...';
    
    PERFORM calculate_weekly_share_price();
    
    SELECT price INTO current_price 
    FROM weekly_share_price 
    ORDER BY week DESC 
    LIMIT 1;
    
    step_result := json_build_object(
        'step', 2,
        'description', 'Share price calculated',
        'new_price', current_price,
        'timestamp', NOW(),
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - start_time))
    );
    simulation_steps := array_append(simulation_steps, step_result);
    
    -- Step 3: Close exchange and expire orders (2-3 minutes)
    RAISE NOTICE 'Step 3: Closing exchange and expiring orders...';
    
    -- Close exchange
    UPDATE exchange_trading_hours SET is_open = false, updated_at = NOW();
    
    -- Expire pending orders
    UPDATE buy_orders SET status = 'expired' WHERE status IN ('pending', 'partial');
    UPDATE sell_orders SET status = 'expired' WHERE status IN ('pending', 'partial');
    
    step_result := json_build_object(
        'step', 3,
        'description', 'Exchange closed, orders expired',
        'timestamp', NOW(),
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - start_time))
    );
    simulation_steps := array_append(simulation_steps, step_result);
    
    -- Step 4: Update vesting statuses (3-4 minutes)
    RAISE NOTICE 'Step 4: Updating vesting statuses...';
    
    -- Update vesting slots that have completed their hold period
    UPDATE pivot_vesting 
    SET status = 'claimable', updated_at = NOW()
    WHERE status = 'locked' 
    AND end_time <= NOW();
    
    step_result := json_build_object(
        'step', 4,
        'description', 'Vesting statuses updated',
        'claimable_slots', (SELECT COUNT(*) FROM pivot_vesting WHERE status = 'claimable'),
        'timestamp', NOW(),
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - start_time))
    );
    simulation_steps := array_append(simulation_steps, step_result);
    
    -- Step 5: Process any automated claims (4-5 minutes)
    RAISE NOTICE 'Step 5: Processing automated operations...';
    
    -- Simulate some automated processing time
    PERFORM pg_sleep(1);
    
    step_result := json_build_object(
        'step', 5,
        'description', 'Automated operations processed',
        'timestamp', NOW(),
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - start_time))
    );
    simulation_steps := array_append(simulation_steps, step_result);
    
    -- Step 6: Reopen exchange for new week (5-6 minutes)
    RAISE NOTICE 'Step 6: Reopening exchange for new week...';
    
    -- Open exchange
    UPDATE exchange_trading_hours SET is_open = true, updated_at = NOW();
    
    step_result := json_build_object(
        'step', 6,
        'description', 'Exchange reopened for new week',
        'timestamp', NOW(),
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - start_time))
    );
    simulation_steps := array_append(simulation_steps, step_result);
    
    -- Build final result
    SELECT json_build_object(
        'success', true,
        'simulation', 'weekly_cycle_6_minutes',
        'start_time', start_time,
        'end_time', NOW(),
        'total_duration_seconds', EXTRACT(EPOCH FROM (NOW() - start_time)),
        'steps', simulation_steps,
        'final_state', json_build_object(
            'share_price', current_price,
            'exchange_open', true,
            'claimable_vesting_slots', (SELECT COUNT(*) FROM pivot_vesting WHERE status = 'claimable'),
            'active_buy_orders', (SELECT COUNT(*) FROM buy_orders WHERE status != 'expired'),
            'active_sell_orders', (SELECT COUNT(*) FROM sell_orders WHERE status != 'expired')
        )
    ) INTO result;
    
    RAISE NOTICE 'Simulation completed in % seconds', EXTRACT(EPOCH FROM (NOW() - start_time));
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'simulation', 'weekly_cycle_6_minutes',
            'failed_at', NOW(),
            'duration_before_failure', EXTRACT(EPOCH FROM (NOW() - start_time))
        );
END;
$$ LANGUAGE plpgsql;

-- Helper function to get simulation status
CREATE OR REPLACE FUNCTION get_simulation_status()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'timestamp', NOW(),
        'exchange_status', (
            SELECT CASE 
                WHEN EXISTS(SELECT 1 FROM exchange_trading_hours WHERE is_open = true) 
                THEN 'open' 
                ELSE 'closed' 
            END
        ),
        'current_share_price', (SELECT price FROM weekly_share_price ORDER BY week DESC LIMIT 1),
        'jse200_latest', (SELECT closing_value FROM jse200_weekly_data ORDER BY week_start DESC LIMIT 1),
        'system_health', json_build_object(
            'vesting_slots_active', (SELECT COUNT(*) FROM pivot_vesting WHERE status IN ('vest', 'locked')),
            'orders_pending', (SELECT COUNT(*) FROM buy_orders WHERE status = 'pending'),
            'transactions_today', (SELECT COUNT(*) FROM share_transactions WHERE DATE(created_at) = CURRENT_DATE)
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Run the simulation
SELECT run_weekly_cycle_simulation();
