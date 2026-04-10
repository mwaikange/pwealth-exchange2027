-- Simulate complete weekly cycle from Sunday 23:59 to Monday 10:05 in 6 minutes
-- This tests the entire weekly maintenance process

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
BEGIN
    simulation_start := NOW();
    
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    WEEKLY CYCLE SIMULATION (6 MINUTES)                      █';
    RAISE NOTICE '█                    Sunday 23:59 → Monday 10:05                              █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE 'Simulation started at: %', simulation_start;
    RAISE NOTICE '';
    
    -- Get initial status
    SELECT get_exchange_status() INTO initial_status;
    SELECT get_current_share_price() INTO current_price_before;
    
    RAISE NOTICE 'INITIAL STATE:';
    RAISE NOTICE '=============';
    RAISE NOTICE 'Exchange open: %', initial_status->>'is_trading_open';
    RAISE NOTICE 'Current price: N$%', current_price_before;
    RAISE NOTICE 'Status: %', initial_status->>'status_message';
    RAISE NOTICE '';
    
    -- MINUTE 0-1: SUNDAY 23:59 - CLOSE EXCHANGE
    RAISE NOTICE 'MINUTE 0-1: SUNDAY 23:59 - CLOSING EXCHANGE';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Simulating Sunday 23:59 exchange closure...';
    
    SELECT close_exchange_weekly() INTO close_result;
    
    IF (close_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✅ Exchange closed successfully';
        RAISE NOTICE 'Message: %', close_result->>'message';
        RAISE NOTICE 'Buy orders cancelled: %', close_result->>'cancelled_buy_orders';
        RAISE NOTICE 'Sell orders expired: %', close_result->>'expired_sell_orders';
        RAISE NOTICE 'Refund total: N$%', close_result->>'buy_refund_total';
        RAISE NOTICE 'Shares returned: %', close_result->>'sell_return_total';
    ELSE
        RAISE NOTICE '❌ Exchange closure failed: %', close_result->>'message';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Waiting 1 minute... (simulated)';
    PERFORM pg_sleep(1);
    RAISE NOTICE '';
    
    -- MINUTE 2-3: MONDAY 09:30 - CLEAR ORDER HISTORY
    RAISE NOTICE 'MINUTE 2-3: MONDAY 09:30 - CLEARING ORDER HISTORY';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Simulating Monday 09:30 order history cleanup...';
    
    SELECT clear_weekly_order_history() INTO clear_result;
    
    IF (clear_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✅ Order history cleared successfully';
        RAISE NOTICE 'Message: %', clear_result->>'message';
        RAISE NOTICE 'Expired buy orders: %', clear_result->>'expired_buy_orders';
        RAISE NOTICE 'Expired sell orders: %', clear_result->>'expired_sell_orders';
        RAISE NOTICE 'Amount refunded: N$%', clear_result->>'refunded_amount';
        RAISE NOTICE 'Shares refunded: %', clear_result->>'refunded_shares';
    ELSE
        RAISE NOTICE '❌ Order history clearing failed: %', clear_result->>'message';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Waiting 1 minute... (simulated)';
    PERFORM pg_sleep(1);
    RAISE NOTICE '';
    
    -- MINUTE 4-5: MONDAY 10:03 - CALCULATE NEW SHARE PRICE
    RAISE NOTICE 'MINUTE 4-5: MONDAY 10:03 - CALCULATING NEW SHARE PRICE';
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Simulating Monday 10:03 price calculation...';
    
    -- First ensure we have JSE200 data for calculation
    INSERT INTO jse200_price_update_mondays (
        update_date,
        percent_change,
        created_at
    ) VALUES (
        CURRENT_DATE,
        2.5, -- Simulate 2.5% growth
        NOW()
    ) ON CONFLICT (update_date) DO UPDATE SET
        percent_change = 2.5,
        created_at = NOW();
    
    RAISE NOTICE 'JSE200 data inserted: 2.5% growth for testing';
    
    SELECT calculate_weekly_share_price_simplified() INTO price_result;
    
    IF (price_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✅ Price calculation successful';
        RAISE NOTICE 'Message: %', price_result->>'message';
        RAISE NOTICE 'Base price: N$%', price_result->>'base_price';
        RAISE NOTICE 'Final price: N$%', price_result->>'final_price';
        RAISE NOTICE 'Price change: N$%', price_result->>'price_change';
        RAISE NOTICE 'JSE200 growth: %', price_result->>'jse_percent_change';
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
        RAISE NOTICE 'Trading status: %', open_result->>'is_trading_open';
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
    RAISE NOTICE 'Price change: N$% → N$%', current_price_before, current_price_after;
    RAISE NOTICE 'Windhoek time: %', final_status->>'windhoek_time';
    RAISE NOTICE '';
    
    -- SIMULATION SUMMARY
    RAISE NOTICE 'SIMULATION SUMMARY:';
    RAISE NOTICE '==================';
    RAISE NOTICE '⏱️  Total time: % seconds', EXTRACT(EPOCH FROM (NOW() - simulation_start));
    RAISE NOTICE '🔄 Exchange closure: %', CASE WHEN (close_result->>'success')::BOOLEAN THEN 'SUCCESS' ELSE 'FAILED' END;
    RAISE NOTICE '🧹 History clearing: %', CASE WHEN (clear_result->>'success')::BOOLEAN THEN 'SUCCESS' ELSE 'FAILED' END;
    RAISE NOTICE '💰 Price calculation: %', CASE WHEN (price_result->>'success')::BOOLEAN THEN 'SUCCESS' ELSE 'FAILED' END;
    RAISE NOTICE '🚀 Exchange opening: %', CASE WHEN (open_result->>'success')::BOOLEAN THEN 'SUCCESS' ELSE 'FAILED' END;
    RAISE NOTICE '';
    
    IF (close_result->>'success')::BOOLEAN AND 
       (clear_result->>'success')::BOOLEAN AND 
       (price_result->>'success')::BOOLEAN AND 
       (open_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '🎉 WEEKLY CYCLE SIMULATION: COMPLETE SUCCESS!';
        RAISE NOTICE '   All systems operational for new trading week';
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
