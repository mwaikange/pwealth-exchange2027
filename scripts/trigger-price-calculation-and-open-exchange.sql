-- Trigger price calculation and open exchange with current date/time
-- This will set everything to current (now) date and time

DO $$
DECLARE
    price_result JSON;
    open_result JSON;
    status_result JSON;
    windhoek_time TIMESTAMP;
    current_week DATE;
BEGIN
    windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    current_week := DATE_TRUNC('week', windhoek_time)::DATE + INTERVAL '1 day';
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    TRIGGERING PRICE CALCULATION                           █';
    RAISE NOTICE '█                         AND OPENING EXCHANGE                              █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '🕐 Current Windhoek time (UTC+2): %', windhoek_time;
    RAISE NOTICE '📅 Current week start: %', current_week;
    RAISE NOTICE '';
    
    -- Step 1: Calculate weekly share price
    RAISE NOTICE 'STEP 1: CALCULATING WEEKLY SHARE PRICE';
    RAISE NOTICE '=====================================';
    
    SELECT calculate_weekly_share_price_simplified() INTO price_result;
    
    IF (price_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✅ Price calculation SUCCESS!';
        RAISE NOTICE '   Message: %', price_result->>'message';
        RAISE NOTICE '   Base price: N$%', price_result->>'base_price';
        RAISE NOTICE '   Final price: N$%', price_result->>'final_price';
        RAISE NOTICE '   Price change: N$%', price_result->>'price_change';
        RAISE NOTICE '   JSE200 growth: %%', price_result->>'jse_percent_change';
        RAISE NOTICE '   Effective date: %', price_result->>'effective_date';
    ELSE
        RAISE NOTICE '❌ Price calculation FAILED: %', price_result->>'message';
    END IF;
    
    RAISE NOTICE '';
    
    -- Step 2: Open exchange
    RAISE NOTICE 'STEP 2: OPENING EXCHANGE';
    RAISE NOTICE '=======================';
    
    SELECT open_exchange_weekly() INTO open_result;
    
    IF (open_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✅ Exchange opening SUCCESS!';
        RAISE NOTICE '   Message: %', open_result->>'message';
        RAISE NOTICE '   Current price: N$%', open_result->>'current_price';
        RAISE NOTICE '   Opened at: %', open_result->>'windhoek_time';
        RAISE NOTICE '   Trading open: %', open_result->>'is_trading_open';
    ELSE
        RAISE NOTICE '❌ Exchange opening FAILED: %', open_result->>'message';
    END IF;
    
    RAISE NOTICE '';
    
    -- Step 3: Verify current status
    RAISE NOTICE 'STEP 3: VERIFYING CURRENT STATUS';
    RAISE NOTICE '================================';
    
    SELECT get_exchange_status() INTO status_result;
    
    RAISE NOTICE '📊 CURRENT EXCHANGE STATUS:';
    RAISE NOTICE '   Trading open: %', status_result->>'is_trading_open';
    RAISE NOTICE '   Status message: %', status_result->>'status_message';
    RAISE NOTICE '   Windhoek time: %', status_result->>'windhoek_time';
    RAISE NOTICE '   Current week: %', status_result->>'current_week_start';
    RAISE NOTICE '   Last price update: %', status_result->>'last_price_update';
    RAISE NOTICE '   Trading hours: %', status_result->>'trading_hours';
    RAISE NOTICE '';
    
    -- Step 4: Show current share price
    RAISE NOTICE 'STEP 4: CURRENT SHARE PRICE';
    RAISE NOTICE '===========================';
    
    DECLARE
        current_price NUMERIC;
    BEGIN
        SELECT get_current_share_price() INTO current_price;
        RAISE NOTICE '💰 Current share price: N$%', current_price;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Error getting current price: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    
    -- Final summary
    RAISE NOTICE 'FINAL SUMMARY';
    RAISE NOTICE '=============';
    RAISE NOTICE '✅ Price calculation: %', CASE WHEN (price_result->>'success')::BOOLEAN THEN 'SUCCESS' ELSE 'FAILED' END;
    RAISE NOTICE '✅ Exchange opening: %', CASE WHEN (open_result->>'success')::BOOLEAN THEN 'SUCCESS' ELSE 'FAILED' END;
    RAISE NOTICE '✅ Trading status: %', CASE WHEN (status_result->>'is_trading_open')::BOOLEAN THEN 'OPEN' ELSE 'CLOSED' END;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SYSTEM IS NOW CURRENT AND READY FOR TESTING!';
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    
END $$;
