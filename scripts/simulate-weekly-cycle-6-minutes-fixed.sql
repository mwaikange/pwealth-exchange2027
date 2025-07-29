-- Simulate a complete weekly cycle in 6 minutes with proper Supabase compliance
-- This runs the full exchange cycle: price calculation -> open -> trading -> close

CREATE OR REPLACE FUNCTION run_weekly_cycle_simulation()
RETURNS JSON AS $$
DECLARE
    result JSON;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    current_price NUMERIC;
    jse200_value NUMERIC;
    exchange_status TEXT;
    simulation_id UUID;
BEGIN
    start_time := NOW();
    simulation_id := gen_random_uuid();
    
    RAISE NOTICE 'Starting weekly cycle simulation % at %', simulation_id, start_time;
    
    -- Step 1: Calculate new weekly price
    RAISE NOTICE 'Step 1: Calculating weekly price...';
    
    -- Get current JSE200 value (or create sample data)
    SELECT price INTO jse200_value 
    FROM jse200_index 
    ORDER BY date DESC 
    LIMIT 1;
    
    IF jse200_value IS NULL THEN
        -- Create sample JSE200 data
        INSERT INTO jse200_index (date, price, change_percent)
        VALUES (CURRENT_DATE, 75000.00, 2.5);
        jse200_value := 75000.00;
        RAISE NOTICE 'Created sample JSE200 data: %', jse200_value;
    END IF;
    
    -- Calculate new price based on JSE200
    current_price := 100.00 + (jse200_value / 1000.0);
    
    -- Insert new weekly price
    INSERT INTO weekly_share_price (week, price, jse200_value, change_percent, created_at)
    VALUES (
        DATE_TRUNC('week', CURRENT_DATE),
        current_price,
        jse200_value,
        2.5,
        NOW()
    )
    ON CONFLICT (week) DO UPDATE SET
        price = EXCLUDED.price,
        jse200_value = EXCLUDED.jse200_value,
        change_percent = EXCLUDED.change_percent,
        updated_at = NOW();
    
    RAISE NOTICE 'New weekly price calculated: %', current_price;
    
    -- Step 2: Open exchange
    RAISE NOTICE 'Step 2: Opening exchange...';
    
    INSERT INTO exchange_status (status, last_updated, notes)
    VALUES ('open', NOW(), 'Opened by weekly cycle simulation')
    ON CONFLICT (id) DO UPDATE SET
        status = 'open',
        last_updated = NOW(),
        notes = 'Opened by weekly cycle simulation';
    
    -- Step 3: Create sample trading activity
    RAISE NOTICE 'Step 3: Creating sample trading activity...';
    
    -- Create some sample buy orders
    INSERT INTO buy_orders (user_uuid, shares, price_per_share, total_amount, status, created_at)
    SELECT 
        gen_random_uuid(),
        (random() * 100 + 10)::NUMERIC(10,4),
        current_price * (0.95 + random() * 0.1),
        0,
        'pending',
        NOW() - (random() * INTERVAL '1 hour')
    FROM generate_series(1, 5);
    
    -- Update total_amount for buy orders
    UPDATE buy_orders 
    SET total_amount = shares * price_per_share 
    WHERE total_amount = 0;
    
    -- Create some sample sell orders
    INSERT INTO sell_orders (user_uuid, shares, price_per_share, total_amount, status, created_at)
    SELECT 
        gen_random_uuid(),
        (random() * 50 + 5)::NUMERIC(10,4),
        current_price * (1.0 + random() * 0.1),
        0,
        'pending',
        NOW() - (random() * INTERVAL '1 hour')
    FROM generate_series(1, 3);
    
    -- Update total_amount for sell orders
    UPDATE sell_orders 
    SET total_amount = shares * price_per_share 
    WHERE total_amount = 0;
    
    RAISE NOTICE 'Sample trading activity created';
    
    -- Step 4: Wait simulation (in real scenario, this would be 6 minutes)
    RAISE NOTICE 'Step 4: Simulating 6-minute trading period...';
    PERFORM pg_sleep(2); -- Short sleep for demo
    
    -- Step 5: Close exchange
    RAISE NOTICE 'Step 5: Closing exchange...';
    
    UPDATE exchange_status 
    SET status = 'closed',
        last_updated = NOW(),
        notes = 'Closed by weekly cycle simulation'
    WHERE id = 1;
    
    -- Expire pending orders
    UPDATE buy_orders 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending';
    
    UPDATE sell_orders 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending';
    
    end_time := NOW();
    
    RAISE NOTICE 'Weekly cycle simulation completed at %', end_time;
    
    -- Get final status
    SELECT status INTO exchange_status FROM exchange_status WHERE id = 1;
    
    SELECT json_build_object(
        'success', true,
        'simulation_id', simulation_id,
        'message', 'Weekly cycle simulation completed successfully',
        'start_time', start_time,
        'end_time', end_time,
        'duration_seconds', EXTRACT(EPOCH FROM (end_time - start_time)),
        'new_price', current_price,
        'jse200_value', jse200_value,
        'final_exchange_status', exchange_status,
        'steps_completed', json_build_array(
            'Price calculation',
            'Exchange opened',
            'Trading activity created',
            'Trading period simulated',
            'Exchange closed'
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Weekly cycle simulation failed',
            'simulation_id', simulation_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION run_weekly_cycle_simulation() TO authenticated;

-- Execute the simulation
SELECT run_weekly_cycle_simulation();
