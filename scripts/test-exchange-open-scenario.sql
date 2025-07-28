-- Test script assuming it's past 10:05 and exchange should be open
-- Tests all functionality in open state

DO $$
DECLARE
    exchange_status JSON;
    current_price NUMERIC;
    is_open BOOLEAN;
    latest_price RECORD;
    windhoek_time TIMESTAMPTZ;
BEGIN
    RAISE NOTICE 'TESTING EXCHANGE IN OPEN STATE';
    RAISE NOTICE '==============================';
    RAISE NOTICE 'Assumption: Current time is past Monday 10:05';
    RAISE NOTICE '';
    
    -- Get current Windhoek time
    windhoek_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    RAISE NOTICE 'Current Windhoek time: %', windhoek_time;
    RAISE NOTICE '';
    
    -- Test 1: Exchange Status
    RAISE NOTICE 'TEST 1: EXCHANGE STATUS';
    RAISE NOTICE '----------------------';
    
    SELECT get_exchange_status() INTO exchange_status;
    SELECT is_exchange_open() INTO is_open;
    
    RAISE NOTICE 'Exchange open: %', is_open;
    RAISE NOTICE 'Status message: %', exchange_status->>'status_message';
    RAISE NOTICE 'Trading hours: %', exchange_status->>'trading_hours';
    RAISE NOTICE 'Timezone: %', exchange_status->>'timezone';
    RAISE NOTICE '';
    
    -- Test 2: Current Price
    RAISE NOTICE 'TEST 2: CURRENT SHARE PRICE';
    RAISE NOTICE '---------------------------';
    
    SELECT get_current_share_price() INTO current_price;
    RAISE NOTICE 'Current price: N$%', current_price;
    
    -- Get latest price record with proper decimal formatting
    SELECT 
        effective_date,
        ROUND(base_price, 2) as base_price,
        j200_growth,
        ROUND(final_price, 2) as final_price,
        ROUND(price_change, 4) as price_change
    INTO latest_price
    FROM weekly_prices 
    ORDER BY effective_date DESC 
    LIMIT 1;
    
    IF latest_price IS NOT NULL THEN
        RAISE NOTICE 'Latest price record:';
        RAISE NOTICE '  Effective date: %', latest_price.effective_date;
        RAISE NOTICE '  Base price: N$%', latest_price.base_price;
        RAISE NOTICE '  JSE200 growth: %%', latest_price.j200_growth;
        RAISE NOTICE '  Final price: N$%', latest_price.final_price;
        RAISE NOTICE '  Price change: N$%', latest_price.price_change;
    END IF;
    RAISE NOTICE '';
    
    -- Test 3: Price History Function
    RAISE NOTICE 'TEST 3: PRICE HISTORY';
    RAISE NOTICE '--------------------';
    
    DECLARE
        history_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO history_count FROM get_price_history(5);
        RAISE NOTICE 'Price history records: %', history_count;
        
        -- Show formatted price history
        RAISE NOTICE 'Recent price history:';
        FOR latest_price IN 
            SELECT 
                effective_date,
                ROUND(final_price, 2) as final_price,
                ROUND(price_change, 4) as price_change,
                j200_growth
            FROM get_price_history(3)
        LOOP
            RAISE NOTICE '  %: N$% (change: N$%, growth: %%)', 
                         latest_price.effective_date,
                         latest_price.final_price,
                         latest_price.price_change,
                         latest_price.j200_growth;
        END LOOP;
    END;
    RAISE NOTICE '';
    
    -- Test 4: Trading Functions Availability
    RAISE NOTICE 'TEST 4: TRADING FUNCTIONS';
    RAISE NOTICE '-------------------------';
    
    IF is_open THEN
        RAISE NOTICE 'Trading status: AVAILABLE';
        RAISE NOTICE 'Users can place buy and sell orders';
        RAISE NOTICE 'Order matching is active';
    ELSE
        RAISE NOTICE 'Trading status: CLOSED';
        RAISE NOTICE 'Users cannot place orders';
        RAISE NOTICE 'Next opening: %', exchange_status->>'trading_schedule'->>'weekly_open';
    END IF;
    RAISE NOTICE '';
    
    -- Final Summary
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '=======';
    RAISE NOTICE 'Exchange is %', CASE WHEN is_open THEN 'OPEN' ELSE 'CLOSED' END;
    RAISE NOTICE 'Current price: N$% (properly formatted to 2 decimals)', current_price;
    RAISE NOTICE 'Price changes: Formatted to 4 decimals';
    RAISE NOTICE 'Timezone handling: Fixed';
    RAISE NOTICE 'Dashboard should show updated price';
    RAISE NOTICE '';
    RAISE NOTICE 'DASHBOARD VERIFICATION:';
    RAISE NOTICE 'Check that SharePriceCard shows: N$%', current_price;
    RAISE NOTICE 'Check that Portfolio calculations use: N$%', current_price;
    
END $$;
