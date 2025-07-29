-- Fixed simulation that uses actual table names and real percentage data
DO $$
DECLARE
    close_result JSON;
    clear_result JSON;
    price_result JSON;
    open_result JSON;
    initial_status JSON;
    final_status JSON;
    current_price_before NUMERIC;
    current_price_after NUMERIC;
    simulation_start TIMESTAMP;
    latest_jse_data RECORD;
BEGIN
    simulation_start := NOW();
    
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    WEEKLY CYCLE SIMULATION (6 MINUTES)                      █';
    RAISE NOTICE '█                    Sunday 23:59 → Monday 10:05                              █';
    RAISE NOTICE '█                    Using REAL JSE200 data from your table                   █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE 'Simulation started at: %', simulation_start;
    RAISE NOTICE '';
    
    -- Get initial status
    SELECT get_exchange_status() INTO initial_status;
    SELECT get_current_share_price() INTO current_price_before;
    
    -- Get latest JSE200 data to show what we'll use
    SELECT * INTO latest_jse_data
    FROM jse200_priceupdate_mondays 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    RAISE NOTICE 'INITIAL STATE:';
    RAISE NOTICE '=============';
    RAISE NOTICE 'Exchange open: %', initial_status->>'is_trading_open';
    RAISE NOTICE 'Current price: N$%', current_price_before;
    RAISE NOTICE 'Status: %', initial_status->>'status_message';
    RAISE NOTICE '';
    RAISE NOTICE 'LATEST JSE200 DATA TO USE:';
    RAISE NOTICE 'Week: %, JSE200: %, Change: %%, Price: %', 
                 latest_jse_data.week_start_date, 
                 latest_jse_data.price, 
                 latest_jse_data.percent_change,
                 latest_jse_data.price;
    RAISE NOTICE '';
    
    -- MINUTE 0-1: SUNDAY 23:59 - CLOSE EXCHANGE
    RAISE NOTICE 'MINUTE 0-1: SUNDAY 23:59 - CLOSING EXCHANGE';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Simulating Sunday 23:59 exchange closure...';
    
    SELECT close_exchange_weekly() INTO close_result;
    
    IF (close_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✅ Exchange closed successfully';
        RAISE NOTICE 'Message: %', close_result->>'message';
        RAISE NOTICE 'Buy orders cancelled: %', COALESCE(close_result->>'cancelled_buy_orders', '0');
        RAISE NOTICE 'Sell orders expired: %', COALESCE(close_result->>'expired_sell_orders', '0');
        RAISE NOTICE 'Refund total: N$%', COALESCE(close_result->>'buy_refund_total', '0.00');
        RAISE NOTICE 'Shares returned: %', COALESCE(close_result->>'sell_return_total', '0.00');
    ELSE
        RAISE NOTICE '❌ Exchange closure failed: %', close_result->>'message';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Waiting 1 minute... (simulated)';
    PERFORM pg_sleep(1);
    RAISE NOTICE '';
    
    -- MINUTE 2-3: MONDAY 09:30 - CLEAR ORDER HISTORY (UI ONLY - NOT DELETE FROM TABLES)
    RAISE NOTICE 'MINUTE 2-3: MONDAY 09:30 - CLEARING ORDER HISTORY FROM UI';
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'Simulating Monday 09:30 order history UI cleanup...';
    RAISE NOTICE 'NOTE: This marks orders as "archived" for UI filtering - NO DATA DELETED';
    
    SELECT clear_weekly_order_history_ui_only() INTO clear_result;
    
    IF (clear_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✅ Order history UI cleared successfully';
        RAISE NOTICE 'Message: %', clear_result->>'message';
        RAISE NOTICE 'Buy orders archived: %', COALESCE(clear_result->>'archived_buy_orders', '0');
        RAISE NOTICE 'Sell orders archived: %', COALESCE(clear_result->>'archived_sell_orders', '0');
        RAISE NOTICE 'NOTE: All data preserved in tables for transaction history';
    ELSE
        RAISE NOTICE '❌ Order history UI clearing failed: %', clear_result->>'message';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Waiting 1 minute... (simulated)';
    PERFORM pg_sleep(1);
    RAISE NOTICE '';
    
    -- MINUTE 4-5: MONDAY 10:03 - CALCULATE NEW SHARE PRICE
    RAISE NOTICE 'MINUTE 4-5: MONDAY 10:03 - CALCULATING NEW SHARE PRICE';
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Simulating Monday 10:03 price calculation...';
    RAISE NOTICE 'Using REAL JSE200 data: %% change', latest_jse_data.percent_change;
    
    -- Add today's JSE200 data using the REAL percentage from your latest data
    -- This simulates getting fresh JSE200 data for today
    INSERT INTO jse200_priceupdate_mondays (
        week_start_date,
        price,
        percent_change,
        day_of_week,
        created_at,
        updated_at
    ) VALUES (
        date_trunc('week', CURRENT_DATE)::date, -- This Monday
        latest_jse_data.price * (1 + (latest_jse_data.percent_change / 100)), -- Calculate new JSE price
        latest_jse_data.percent_change, -- Use REAL percentage change
        'Monday',
        NOW(),
        NOW()
    ) ON CONFLICT (week_start_date) DO UPDATE SET
        price = latest_jse_data.price * (1 + (latest_jse_data.percent_change / 100)),
        percent_change = latest_jse_data.percent_change,
        updated_at = NOW();
    
    RAISE NOTICE 'JSE200 data updated for current week using real %% change: %%', latest_jse_data.percent_change;
    
    -- Now calculate the weekly share price using the real data
    SELECT calculate_weekly_share_price_simplified() INTO price_result;
    
    IF (price_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✅ Price calculation successful';
        RAISE NOTICE 'Message: %', price_result->>'message';
        RAISE NOTICE 'Base price: N$%', price_result->>'base_price';
        RAISE NOTICE 'Final price: N$%', price_result->>'final_price';
        RAISE NOTICE 'Price change: N$%', price_result->>'price_change';
        RAISE NOTICE 'JSE200 growth: %%', price_result->>'jse_percent_change';
        RAISE NOTICE 'Calculation: N$% × (1 + %%/100) = N$%', 
                     current_price_before, 
                     price_result->>'jse_percent_change',
                     price_result->>'final_price';
    ELSE
        RAISE NOTICE '❌ Price calculation failed: %', price_result->>'message';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Waiting 1 minute... (simulated)';
    PERFORM pg_sleep(1);
    RAISE NOTICE '';
    
    -- MINUTE 6: MONDAY 10:05 - OPEN EXCHANGE
    RAISE NOTICE 'MINUTE 6: MONDAY 10:05 - OPENING EXCHANGE';
    RAISE NOTICE '=======================================';
    RAISE NOTICE 'Simulating Monday 10:05 exchange opening...';
    
    SELECT open_exchange_weekly() INTO open_result;
    
    IF (open_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✅ Exchange opened successfully';
        RAISE NOTICE 'Message: %', open_result->>'message';
        RAISE NOTICE 'Trading status: %', open_result->>'trading_open';
        RAISE NOTICE 'Current price: N$%', open_result->>'current_price';
    ELSE
        RAISE NOTICE '❌ Exchange opening failed: %', open_result->>'message';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Final verification...';
    PERFORM pg_sleep(1);
    RAISE NOTICE '';
    
    -- FINAL STATUS CHECK
    SELECT get_exchange_status() INTO final_status;
    SELECT get_current_share_price() INTO current_price_after;
    
    RAISE NOTICE 'FINAL STATE AFTER WEEKLY CYCLE:';
    RAISE NOTICE '===============================';
    RAISE NOTICE 'Exchange open: %', final_status->>'is_trading_open';
    RAISE NOTICE 'Current price: N$%', current_price_after;
    RAISE NOTICE 'Status: %', final_status->>'status_message';
    RAISE NOTICE 'Price change: N$% → N$% (%%)', 
                 current_price_before, 
                 current_price_after,
                 ROUND(((current_price_after - current_price_before) / current_price_before * 100)::NUMERIC, 2);
    RAISE NOTICE 'Windhoek time: %', final_status->>'windhoek_time';
    RAISE NOTICE '';
    
    -- SIMULATION SUMMARY
    RAISE NOTICE 'SIMULATION SUMMARY:';
    RAISE NOTICE '==================';
    RAISE NOTICE '⏱️  Total time: % seconds', EXTRACT(EPOCH FROM (NOW() - simulation_start));
    RAISE NOTICE '📊 JSE200 change used: %%', latest_jse_data.percent_change;
    RAISE NOTICE '💰 Price calculation: N$% × (1 + %%/100) = N$%', 
                 current_price_before, 
                 latest_jse_data.percent_change,
                 current_price_after;
    RAISE NOTICE '🔄 Exchange closure: %', CASE WHEN (close_result->>'success')::BOOLEAN THEN 'SUCCESS' ELSE 'FAILED' END;
    RAISE NOTICE '🧹 History UI clearing: %', CASE WHEN (clear_result->>'success')::BOOLEAN THEN 'SUCCESS' ELSE 'FAILED' END;
    RAISE NOTICE '💰 Price calculation: %', CASE WHEN (price_result->>'success')::BOOLEAN THEN 'SUCCESS' ELSE 'FAILED' END;
    RAISE NOTICE '🚀 Exchange opening: %', CASE WHEN (open_result->>'success')::BOOLEAN THEN 'SUCCESS' ELSE 'FAILED' END;
    RAISE NOTICE '';
    
    IF (close_result->>'success')::BOOLEAN AND 
       (clear_result->>'success')::BOOLEAN AND 
       (price_result->>'success')::BOOLEAN AND 
       (open_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '🎉 WEEKLY CYCLE SIMULATION: COMPLETE SUCCESS!';
        RAISE NOTICE '   All systems operational for new trading week';
        RAISE NOTICE '   Share price updated from N$% to N$% using real JSE200 data', 
                     current_price_before, current_price_after;
        RAISE NOTICE '   All transaction history preserved in database tables';
    ELSE
        RAISE NOTICE '⚠️  WEEKLY CYCLE SIMULATION: PARTIAL SUCCESS';
        RAISE NOTICE '   Some operations failed - check logs above';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    WEEKLY CYCLE SIMULATION COMPLETED                        █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
END $$;
