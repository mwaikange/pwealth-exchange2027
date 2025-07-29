-- Simulate weekly cycle in 6 minutes with proper Supabase compliance
-- This script creates a function that runs the complete weekly cycle simulation

CREATE OR REPLACE FUNCTION run_weekly_cycle_simulation()
RETURNS JSON AS $$
DECLARE
    result JSON;
    start_time TIMESTAMPTZ;
    current_price NUMERIC;
    jse200_change NUMERIC;
    new_price NUMERIC;
    simulation_status TEXT;
BEGIN
    start_time := NOW();
    simulation_status := 'Starting 6-minute weekly cycle simulation';
    
    RAISE NOTICE '%', simulation_status;
    RAISE NOTICE 'Simulation started at: %', start_time;
    
    -- Step 1: Close current exchange (simulate Friday close)
    simulation_status := 'Step 1: Closing exchange for weekly cycle';
    RAISE NOTICE '%', simulation_status;
    
    UPDATE exchange_trading_hours 
    SET is_open = false,
        last_updated = NOW()
    WHERE id = 1;
    
    -- Step 2: Get current price
    SELECT price INTO current_price 
    FROM weekly_share_price 
    ORDER BY week DESC 
    LIMIT 1;
    
    IF current_price IS NULL THEN
        current_price := 108.20; -- Default starting price
        RAISE NOTICE 'No existing price found, using default: %', current_price;
    ELSE
        RAISE NOTICE 'Current share price: %', current_price;
    END IF;
    
    -- Step 3: Simulate JSE200 weekly change (random between -5% and +5%)
    jse200_change := (RANDOM() * 10 - 5); -- Random between -5 and +5
    RAISE NOTICE 'Simulated JSE200 weekly change: %% %', jse200_change;
    
    -- Step 4: Calculate new price based on JSE200 change
    new_price := current_price * (1 + jse200_change / 100);
    new_price := ROUND(new_price, 2);
    
    RAISE NOTICE 'Calculated new price: % (change: %% %)', 
        new_price, ROUND(((new_price - current_price) / current_price * 100), 2);
    
    -- Step 5: Insert new weekly price
    INSERT INTO weekly_share_price (week, price, jse200_change, created_at)
    VALUES (
        DATE_TRUNC('week', NOW()),
        new_price,
        jse200_change,
        NOW()
    )
    ON CONFLICT (week) 
    DO UPDATE SET 
        price = EXCLUDED.price,
        jse200_change = EXCLUDED.jse200_change,
        created_at = NOW();
    
    simulation_status := 'Step 5: New weekly price inserted';
    RAISE NOTICE '%', simulation_status;
    
    -- Step 6: Wait simulation (in real system this would be cron-based)
    simulation_status := 'Step 6: Simulating weekend processing time...';
    RAISE NOTICE '%', simulation_status;
    
    -- Simulate some processing time
    PERFORM pg_sleep(2);
    
    -- Step 7: Reopen exchange (simulate Monday open)
    simulation_status := 'Step 7: Reopening exchange for new week';
    RAISE NOTICE '%', simulation_status;
    
    UPDATE exchange_trading_hours 
    SET is_open = true,
        last_updated = NOW()
    WHERE id = 1;
    
    -- Step 8: Update exchange status
    INSERT INTO exchange_status_log (
        status, 
        message, 
        price_at_time, 
        created_at
    ) VALUES (
        'cycle_completed',
        'Weekly cycle simulation completed - Exchange reopened',
        new_price,
        NOW()
    );
    
    simulation_status := 'Simulation completed successfully';
    RAISE NOTICE '%', simulation_status;
    RAISE NOTICE 'Total simulation time: % seconds', 
        EXTRACT(EPOCH FROM (NOW() - start_time));
    
    SELECT json_build_object(
        'success', true,
        'message', 'Weekly cycle simulation completed',
        'data', json_build_object(
            'start_time', start_time,
            'end_time', NOW(),
            'duration_seconds', EXTRACT(EPOCH FROM (NOW() - start_time)),
            'old_price', current_price,
            'new_price', new_price,
            'jse200_change_percent', jse200_change,
            'price_change_percent', ROUND(((new_price - current_price) / current_price * 100), 2),
            'exchange_reopened', true,
            'simulation_status', simulation_status
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error in weekly cycle simulation: ' || SQLERRM,
            'simulation_status', simulation_status
        );
END;
$$ LANGUAGE plpgsql;

-- Create supporting table for exchange status logging if it doesn't exist
CREATE TABLE IF NOT EXISTS exchange_status_log (
    id SERIAL PRIMARY KEY,
    status TEXT NOT NULL,
    message TEXT,
    price_at_time NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION run_weekly_cycle_simulation() TO authenticated;
GRANT ALL ON TABLE exchange_status_log TO authenticated;

-- Test the function
SELECT run_weekly_cycle_simulation();
