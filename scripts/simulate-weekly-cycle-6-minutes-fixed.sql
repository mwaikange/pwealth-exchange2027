-- Simulate Weekly Cycle in 6 Minutes
-- This function simulates the complete weekly exchange cycle

CREATE OR REPLACE FUNCTION run_weekly_cycle_simulation()
RETURNS JSON AS $$
DECLARE
    simulation_start TIMESTAMPTZ;
    initial_price NUMERIC;
    final_price NUMERIC;
    jse_data RECORD;
    close_result JSON;
    clear_result JSON;
    price_result JSON;
    open_result JSON;
    final_status JSON;
BEGIN
    simulation_start := NOW();
    
    -- Get initial price
    SELECT COALESCE(price, 100) INTO initial_price
    FROM weekly_share_price 
    ORDER BY week DESC LIMIT 1;
    
    -- Step 1: Close Exchange (Sunday 23:59)
    SELECT close_exchange_for_week() INTO close_result;
    
    -- Step 2: Clear Order History UI (Monday 09:30)
    SELECT clear_order_history_ui_only() INTO clear_result;
    
    -- Step 3: Calculate New Price (Monday 10:03)
    SELECT calculate_weekly_share_price() INTO price_result;
    
    -- Get final price
    SELECT COALESCE(price, 100) INTO final_price
    FROM weekly_share_price 
    ORDER BY week DESC LIMIT 1;
    
    -- Get JSE200 data used
    SELECT * INTO jse_data
    FROM jse200_weekly_data 
    ORDER BY week_start_date DESC LIMIT 1;
    
    -- Step 4: Open Exchange (Monday 10:05)
    SELECT open_exchange_for_week() INTO open_result;
    
    -- Get final system status
    SELECT get_exchange_status() INTO final_status;
    
    RETURN json_build_object(
        'success', true,
        'simulation_start', simulation_start,
        'simulation_duration_seconds', EXTRACT(EPOCH FROM (NOW() - simulation_start)),
        'initial_price', initial_price,
        'final_price', final_price,
        'price_change_amount', final_price - initial_price,
        'price_change_percent', ROUND(((final_price - initial_price) / initial_price * 100)::NUMERIC, 2),
        'jse200_data_used', json_build_object(
            'week_start_date', jse_data.week_start_date,
            'price', jse_data.price,
            'percent_change', jse_data.percent_change,
            'created_at', jse_data.created_at
        ),
        'operations', json_build_object(
            'exchange_closure', close_result,
            'history_clearing', clear_result,
            'price_calculation', price_result,
            'exchange_opening', open_result
        ),
        'final_status', final_status,
        'completed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;
