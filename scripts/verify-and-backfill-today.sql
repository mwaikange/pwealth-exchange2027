-- Verify everything works and backfill today's price calculation
-- Clean output, no emojis, acts as Monday backfill script

DO $$
DECLARE
    table_exists BOOLEAN;
    record_count INTEGER;
    latest_record RECORD;
    weekly_count INTEGER;
    current_price NUMERIC;
    test_result RECORD;
    today_date DATE;
    today_is_monday BOOLEAN;
BEGIN
    today_date := CURRENT_DATE;
    today_is_monday := EXTRACT(DOW FROM today_date) = 1; -- Monday = 1
    
    RAISE NOTICE 'VERIFICATION AND BACKFILL SCRIPT';
    RAISE NOTICE '===============================';
    RAISE NOTICE 'Today: % (Monday: %)', today_date, today_is_monday;
    RAISE NOTICE '';
    
    -- Test 1: Verify lowercase table exists and has data
    RAISE NOTICE 'TEST 1: JSE200 TABLE VERIFICATION';
    RAISE NOTICE '----------------------------------';
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'jse200_priceupdate_mondays'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO record_count FROM jse200_priceupdate_mondays;
        RAISE NOTICE 'Table jse200_priceupdate_mondays exists: YES';
        RAISE NOTICE 'Records: %', record_count;
        
        IF record_count > 0 THEN
            -- Get latest record
            SELECT * INTO latest_record 
            FROM jse200_priceupdate_mondays 
            ORDER BY week_start_date DESC 
            LIMIT 1;
            
            RAISE NOTICE 'Latest date: %', latest_record.week_start_date;
            RAISE NOTICE 'Latest price: %', latest_record.price;
            RAISE NOTICE 'Latest change: %', latest_record.percent_change;
            RAISE NOTICE 'Status: PASS - Table has valid data';
        ELSE
            RAISE NOTICE 'Status: FAIL - Table exists but has no data';
        END IF;
    ELSE
        RAISE NOTICE 'Status: FAIL - Table jse200_priceupdate_mondays NOT FOUND';
        RETURN;
    END IF;
    
    RAISE NOTICE '';
    
    -- Test 2: Verify weekly_prices table
    RAISE NOTICE 'TEST 2: WEEKLY PRICES TABLE';
    RAISE NOTICE '--------------------------';
    
    BEGIN
        SELECT COUNT(*) INTO weekly_count FROM weekly_prices;
        RAISE NOTICE 'Table weekly_prices accessible: YES';
        RAISE NOTICE 'Records: %', weekly_count;
        
        IF weekly_count > 0 THEN
            SELECT * INTO latest_record 
            FROM weekly_prices 
            ORDER BY effective_date DESC 
            LIMIT 1;
            
            RAISE NOTICE 'Latest effective date: %', latest_record.effective_date;
            RAISE NOTICE 'Latest final price: %', latest_record.final_price;
            RAISE NOTICE 'JSE200 growth used: %', latest_record.j200_growth;
        END IF;
        
        RAISE NOTICE 'Status: PASS';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Status: FAIL - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    
    -- Test 3: Test get_current_share_price function
    RAISE NOTICE 'TEST 3: CURRENT PRICE FUNCTION';
    RAISE NOTICE '------------------------------';
    
    BEGIN
        SELECT get_current_share_price() INTO current_price;
        RAISE NOTICE 'Function get_current_share_price(): WORKS';
        RAISE NOTICE 'Current price: %', current_price;
        RAISE NOTICE 'Status: PASS';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Status: FAIL - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    
    -- Test 4: BACKFILL - Run price calculation for today
    RAISE NOTICE 'TEST 4: BACKFILL PRICE CALCULATION';
    RAISE NOTICE '----------------------------------';
    
    BEGIN
        SELECT * INTO test_result FROM trigger_weekly_price_calculation();
        
        RAISE NOTICE 'Function trigger_weekly_price_calculation(): WORKS';
        RAISE NOTICE 'Success: %', test_result.success;
        RAISE NOTICE 'Message: %', test_result.message;
        
        IF test_result.new_price IS NOT NULL THEN
            RAISE NOTICE 'New price calculated: %', test_result.new_price;
            RAISE NOTICE 'Growth rate applied: %', test_result.growth_rate;
            RAISE NOTICE 'Status: PASS - NEW PRICE CALCULATED';
        ELSE
            RAISE NOTICE 'Status: INFO - %', test_result.message;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Status: FAIL - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    
    -- Test 5: Test price history function
    RAISE NOTICE 'TEST 5: PRICE HISTORY FUNCTION';
    RAISE NOTICE '------------------------------';
    
    BEGIN
        DECLARE
            history_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO history_count 
            FROM get_price_history(5);
            
            RAISE NOTICE 'Function get_price_history(): WORKS';
            RAISE NOTICE 'History records returned: %', history_count;
            RAISE NOTICE 'Status: PASS';
        END;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Status: FAIL - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    
    -- Final Summary
    RAISE NOTICE 'FINAL SUMMARY';
    RAISE NOTICE '=============';
    RAISE NOTICE 'Table name: jse200_priceupdate_mondays';
    RAISE NOTICE 'JSE200 records: %', record_count;
    RAISE NOTICE 'Weekly prices: %', weekly_count;
    RAISE NOTICE 'Current price: %', current_price;
    RAISE NOTICE '';
    
    IF today_is_monday THEN
        RAISE NOTICE 'MONDAY BACKFILL: Check if new price was calculated above';
    ELSE
        RAISE NOTICE 'NOT MONDAY: Price calculation will run next Monday';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'MANUAL TEST COMMANDS:';
    RAISE NOTICE 'SELECT * FROM jse200_priceupdate_mondays ORDER BY week_start_date DESC LIMIT 3;';
    RAISE NOTICE 'SELECT * FROM weekly_prices ORDER BY effective_date DESC LIMIT 3;';
    RAISE NOTICE 'SELECT get_current_share_price();';
    RAISE NOTICE 'SELECT * FROM trigger_weekly_price_calculation();';
    RAISE NOTICE '';
    RAISE NOTICE 'VERIFICATION COMPLETE';
END $$;
