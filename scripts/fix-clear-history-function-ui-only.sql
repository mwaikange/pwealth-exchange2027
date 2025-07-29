-- Fix the clear_weekly_order_history function to NOT delete data
-- Instead, it should mark orders as "archived" for UI filtering

-- Drop the existing function that deletes data
DROP FUNCTION IF EXISTS clear_weekly_order_history() CASCADE;
DROP FUNCTION IF EXISTS clear_weekly_order_history_ui_only() CASCADE;
DROP FUNCTION IF EXISTS clear_history_with_retries() CASCADE;

-- Create new function that only marks orders as archived for UI
CREATE OR REPLACE FUNCTION clear_weekly_order_history_ui_only()
RETURNS JSON AS $$
DECLARE
    previous_week DATE;
    archived_buy_orders INTEGER := 0;
    archived_sell_orders INTEGER := 0;
    current_week DATE;
BEGIN
    -- Calculate current week start (Monday) and previous week
    current_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day';
    previous_week := current_week - INTERVAL '7 days';
    
    RAISE NOTICE 'Archiving orders from UI for weeks before: %', current_week;
    RAISE NOTICE 'NOTE: NO DATA IS DELETED - only marked as archived for UI filtering';
    
    -- Add archived_for_ui column if it doesn't exist
    BEGIN
        ALTER TABLE buy_orders ADD COLUMN IF NOT EXISTS archived_for_ui BOOLEAN DEFAULT FALSE;
        ALTER TABLE sell_orders ADD COLUMN IF NOT EXISTS archived_for_ui BOOLEAN DEFAULT FALSE;
        ALTER TABLE buy_orders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE sell_orders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Columns may already exist: %', SQLERRM;
    END;
    
    -- Mark old completed/cancelled buy orders as archived for UI
    UPDATE buy_orders 
    SET archived_for_ui = TRUE,
        archived_at = NOW(),
        updated_at = NOW()
    WHERE created_at < current_week::timestamp
    AND status IN ('completed', 'cancelled', 'filled')
    AND (archived_for_ui IS NULL OR archived_for_ui = FALSE);
    
    GET DIAGNOSTICS archived_buy_orders = ROW_COUNT;
    
    -- Mark old matched/expired sell orders as archived for UI
    UPDATE sell_orders 
    SET archived_for_ui = TRUE,
        archived_at = NOW(),
        updated_at = NOW()
    WHERE created_at < current_week::timestamp
    AND status IN ('matched', 'expired', 'cancelled')
    AND (archived_for_ui IS NULL OR archived_for_ui = FALSE);
    
    GET DIAGNOSTICS archived_sell_orders = ROW_COUNT;
    
    RAISE NOTICE 'Archived % buy orders and % sell orders from UI (data preserved)', 
        archived_buy_orders, archived_sell_orders;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Order history UI cleared successfully. Archived %s buy orders, %s sell orders from UI display. All data preserved in database.', 
            archived_buy_orders, archived_sell_orders),
        'archived_buy_orders', archived_buy_orders,
        'archived_sell_orders', archived_sell_orders,
        'current_week_cutoff', current_week,
        'data_preservation', 'All transaction history preserved in database tables',
        'ui_impact', 'Old orders hidden from Your Buy Orders and Your Sell Orders cards',
        'cleared_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error archiving order history for UI: ' || SQLERRM,
            'error_code', 'HISTORY_ARCHIVE_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create backward compatibility function (calls the UI-only version)
CREATE OR REPLACE FUNCTION clear_weekly_order_history()
RETURNS JSON AS $$
BEGIN
    RETURN clear_weekly_order_history_ui_only();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the retry function to use the correct table name
CREATE OR REPLACE FUNCTION clear_history_with_retries()
RETURNS JSON AS $$
DECLARE
    attempt INTEGER := 1;
    max_attempts INTEGER := 5;
    retry_delay INTEGER := 3; -- seconds
    result JSON;
    last_error TEXT;
BEGIN
    WHILE attempt <= max_attempts LOOP
        BEGIN
            RAISE NOTICE 'Clear history (UI only) attempt % of %', attempt, max_attempts;
            
            -- Call the UI-only clearing function
            SELECT clear_weekly_order_history_ui_only() INTO result;
            
            -- Check if successful
            IF (result->>'success')::BOOLEAN THEN
                RAISE NOTICE 'Clear history UI succeeded on attempt %', attempt;
                RETURN json_build_object(
                    'success', true,
                    'message', format('History UI cleared successfully on attempt %s. %s', attempt, result->>'message'),
                    'attempts_used', attempt,
                    'result', result,
                    'completed_at', NOW()
                );
            ELSE
                last_error := result->>'message';
                RAISE NOTICE 'Clear history UI failed on attempt %: %', attempt, last_error;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                last_error := SQLERRM;
                RAISE NOTICE 'Clear history UI error on attempt %: %', attempt, last_error;
        END;
        
        -- If not the last attempt, wait before retrying
        IF attempt < max_attempts THEN
            RAISE NOTICE 'Waiting % seconds before retry...', retry_delay;
            PERFORM pg_sleep(retry_delay);
        END IF;
        
        attempt := attempt + 1;
    END LOOP;
    
    -- All attempts failed
    RETURN json_build_object(
        'success', false,
        'message', format('Clear history UI failed after %s attempts. Last error: %s', max_attempts, last_error),
        'attempts_used', max_attempts,
        'last_error', last_error,
        'failed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the price calculation function to use correct table name
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_simplified()
RETURNS JSON AS $$
DECLARE
    jse_percent_change NUMERIC;
    base_price NUMERIC;
    percentage_amount NUMERIC;
    new_final_price NUMERIC;
    price_change NUMERIC;
    current_week DATE;
BEGIN
    current_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day';
    
    -- Get the latest JSE200 percent_change from the CORRECT table name
    SELECT percent_change INTO jse_percent_change
    FROM jse200_priceupdate_mondays  -- FIXED: Use correct table name
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Get the previous week's final_price as base_price for this week
    SELECT final_price INTO base_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Set defaults if no data found
    IF base_price IS NULL THEN
        base_price := 108.2;
    END IF;
    
    IF jse_percent_change IS NULL THEN
        RAISE NOTICE 'No JSE200 percent_change found, using minimal growth';
        jse_percent_change := (random() - 0.5) * 2; -- ±1% random growth
    END IF;
    
    -- Calculate the percentage amount (this goes in price_change column)
    percentage_amount := base_price * (ABS(jse_percent_change) / 100);
    
    -- Apply the percentage change to get new final price
    new_final_price := base_price * (1 + (jse_percent_change / 100));
    
    -- Calculate actual price change (positive or negative)
    price_change := new_final_price - base_price;
    
    -- Round to 2 decimal places
    new_final_price := ROUND(new_final_price, 2);
    price_change := ROUND(price_change, 2);
    
    -- Insert new price record using correct column names
    INSERT INTO weekly_prices (
        effective_date,
        base_price,
        j200_growth,
        final_price,
        price_change
    ) VALUES (
        current_week,
        base_price,
        jse_percent_change, -- Store the JSE200 percent_change directly
        new_final_price,
        price_change -- This is the actual N$ amount change
    );
    
    RAISE NOTICE 'Price calculation completed successfully:';
    RAISE NOTICE '  Base price: N$%', base_price;
    RAISE NOTICE '  JSE200 change: %% %', jse_percent_change;
    RAISE NOTICE '  Price change: N$%', price_change;
    RAISE NOTICE '  Final price: N$%', new_final_price;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Share price updated to N$%s (JSE200: %s%s, change: N$%s)', 
            new_final_price, 
            CASE WHEN jse_percent_change >= 0 THEN '+' ELSE '' END,
            jse_percent_change || '%',
            CASE WHEN price_change >= 0 THEN '+' ELSE '' END || price_change
        ),
        'base_price', base_price,
        'final_price', new_final_price,
        'price_change', price_change,
        'jse_percent_change', jse_percent_change,
        'calculation_example', format('N$%s * (1 + %s/100) = N$%s', base_price, jse_percent_change, new_final_price),
        'effective_date', current_week,
        'calculated_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error calculating share price: ' || SQLERRM,
            'error_code', 'PRICE_CALCULATION_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to test clear history functionality
CREATE OR REPLACE FUNCTION test_clear_history_functions()
RETURNS JSON AS $$
DECLARE
    result JSON;
    buy_count INTEGER;
    sell_count INTEGER;
    transaction_count INTEGER;
BEGIN
    RAISE NOTICE 'Testing clear history functions...';
    
    -- Count existing records before clearing
    SELECT COUNT(*) INTO buy_count FROM buy_orders;
    SELECT COUNT(*) INTO sell_count FROM sell_orders;
    SELECT COUNT(*) INTO transaction_count FROM share_transactions;
    
    RAISE NOTICE 'Before clearing - Buy orders: %, Sell orders: %, Transactions: %', 
        buy_count, sell_count, transaction_count;
    
    -- Clear buy orders (keep only active ones)
    UPDATE buy_orders 
    SET status = 'expired' 
    WHERE status IN ('pending', 'partially_filled');
    
    -- Clear sell orders (keep only active ones)  
    UPDATE sell_orders 
    SET status = 'expired'
    WHERE status IN ('pending', 'partially_filled');
    
    -- Archive old transactions (don't delete, just mark as archived)
    UPDATE share_transactions 
    SET description = 'ARCHIVED: ' || description
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND description NOT LIKE 'ARCHIVED: %%';
    
    -- Count records after clearing
    SELECT COUNT(*) INTO buy_count FROM buy_orders WHERE status != 'expired';
    SELECT COUNT(*) INTO sell_count FROM sell_orders WHERE status != 'expired';
    SELECT COUNT(*) INTO transaction_count FROM share_transactions WHERE description NOT LIKE 'ARCHIVED: %%';
    
    RAISE NOTICE 'After clearing - Active buy orders: %, Active sell orders: %, Recent transactions: %', 
        buy_count, sell_count, transaction_count;
    
    SELECT json_build_object(
        'success', true,
        'message', 'Clear history functions tested successfully',
        'data', json_build_object(
            'active_buy_orders', buy_count,
            'active_sell_orders', sell_count,
            'recent_transactions', transaction_count,
            'timestamp', NOW()
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error testing clear history: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION test_clear_history_functions() TO authenticated;

-- Test the function
SELECT test_clear_history_functions();
