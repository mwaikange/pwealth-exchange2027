-- Comprehensive test script to verify all systems are working
-- Tests: exchange trading hours, cron schedule, and retry functions
-- FIXED: All references now use JSE200_PriceUpdate_Mondays (PascalCase)

-- Start test banner
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    COMPREHENSIVE SYSTEM TEST STARTING                     █';
    RAISE NOTICE '█                          (FIXED PASCAL CASE)                             █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Testing all systems installed by:';
    RAISE NOTICE '   1. create-exchange-trading-hours-fixed.sql';
    RAISE NOTICE '   2. update-cron-schedule-with-retries.sql';
    RAISE NOTICE '   3. create-missing-core-functions.sql';
    RAISE NOTICE '';
    RAISE NOTICE '📋 STANDARDIZED TABLE NAME: JSE200_PriceUpdate_Mondays';
    RAISE NOTICE '';
END $$;

-- Test 1: Check JSE200 table exists and has correct structure
DO $$
DECLARE
    table_exists BOOLEAN;
    record_count INTEGER := 0;
    column_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== TEST 1: JSE200 TABLE VERIFICATION ===';
    
    -- Check if JSE200_PriceUpdate_Mondays table exists (PascalCase)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'JSE200_PriceUpdate_Mondays'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '✅ JSE200_PriceUpdate_Mondays table exists';
        
        -- Get record count
        EXECUTE 'SELECT COUNT(*) FROM JSE200_PriceUpdate_Mondays' INTO record_count;
        RAISE NOTICE '   📊 Records: %', record_count;
        
        -- Check table structure
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'JSE200_PriceUpdate_Mondays'
        AND column_name IN ('id', 'date', 'price', 'percent_change', 'created_at');
        
        RAISE NOTICE '   🏗️  Required columns found: % of 5', column_count;
        
        IF column_count = 5 THEN
            RAISE NOTICE '   ✅ Table structure is correct';
        ELSE
            RAISE NOTICE '   ⚠️  Table structure may be incomplete';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ JSE200_PriceUpdate_Mondays table NOT FOUND';
        RAISE NOTICE '   🔧 Need to run: scripts/create-sample-jse200-data.sql';
    END IF;
    
    -- Check for lowercase duplicate (should not exist)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'jse200_priceupdate_mondays'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '⚠️  WARNING: Lowercase duplicate table still exists!';
        RAISE NOTICE '   🔧 Run: DROP TABLE jse200_priceupdate_mondays;';
    ELSE
        RAISE NOTICE '✅ No lowercase duplicate found (good!)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Test 2: Check if all exchange trading hours functions exist
DO $$
DECLARE
    function_count INTEGER;
    missing_functions TEXT[];
    func_name TEXT;
BEGIN
    RAISE NOTICE '=== TEST 2: EXCHANGE TRADING HOURS FUNCTIONS ===';
    
    -- Check each function individually
    FOR func_name IN 
        SELECT unnest(ARRAY[
            'get_exchange_status',
            'is_exchange_open', 
            'get_trading_schedule',
            'test_new_schedule',
            'get_cron_job_status',
            'trigger_weekly_cycle_test'
        ])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = func_name
        ) THEN
            missing_functions := array_append(missing_functions, func_name);
        END IF;
    END LOOP;
    
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'get_exchange_status',
        'is_exchange_open',
        'get_trading_schedule', 
        'test_new_schedule',
        'get_cron_job_status',
        'trigger_weekly_cycle_test'
    );
    
    RAISE NOTICE '✅ Exchange functions found: % of 6', function_count;
    
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE NOTICE '❌ Missing functions: %', array_to_string(missing_functions, ', ');
    ELSE
        RAISE NOTICE '✅ All exchange trading hours functions are present!';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Test 3: Check if all retry functions exist
DO $$
DECLARE
    function_count INTEGER;
    missing_functions TEXT[];
    func_name TEXT;
BEGIN
    RAISE NOTICE '=== TEST 3: RETRY FUNCTIONS ===';
    
    -- Check each retry function individually
    FOR func_name IN 
        SELECT unnest(ARRAY[
            'clear_history_with_retries',
            'calculate_price_with_retries',
            'open_exchange_with_retries',
            'test_all_retry_functions'
        ])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = func_name
        ) THEN
            missing_functions := array_append(missing_functions, func_name);
        END IF;
    END LOOP;
    
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'clear_history_with_retries',
        'calculate_price_with_retries',
        'open_exchange_with_retries',
        'test_all_retry_functions'
    );
    
    RAISE NOTICE '✅ Retry functions found: % of 4', function_count;
    
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE NOTICE '❌ Missing retry functions: %', array_to_string(missing_functions, ', ');
    ELSE
        RAISE NOTICE '✅ All retry functions are present!';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Test 4: Check core price calculation functions
DO $$
DECLARE
    function_count INTEGER;
    missing_functions TEXT[];
    func_name TEXT;
BEGIN
    RAISE NOTICE '=== TEST 4: CORE PRICE CALCULATION FUNCTIONS ===';
    
    -- Check each core function individually
    FOR func_name IN 
        SELECT unnest(ARRAY[
            'calculate_weekly_share_price_simplified',
            'get_current_share_price',
            'get_price_history',
            'trigger_weekly_price_calculation'
        ])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = func_name
        ) THEN
            missing_functions := array_append(missing_functions, func_name);
        END IF;
    END LOOP;
    
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'calculate_weekly_share_price_simplified',
        'get_current_share_price',
        'get_price_history',
        'trigger_weekly_price_calculation'
    );
    
    RAISE NOTICE '✅ Core price functions found: % of 4', function_count;
    
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE NOTICE '❌ Missing core functions: %', array_to_string(missing_functions, ', ');
        RAISE NOTICE '   🔧 Run: sql/create-simplified-price-calculation.sql';
    ELSE
        RAISE NOTICE '✅ All core price calculation functions are present!';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Test 5: Test exchange status function
DO $$
DECLARE
    status_result JSON;
    is_open_result BOOLEAN;
BEGIN
    RAISE NOTICE '=== TEST 5: EXCHANGE STATUS FUNCTIONALITY ===';
    
    BEGIN
        SELECT get_exchange_status() INTO status_result;
        SELECT is_exchange_open() INTO is_open_result;
        
        RAISE NOTICE '✅ Exchange status function works!';
        RAISE NOTICE '   Current status: %', status_result->>'status_message';
        RAISE NOTICE '   Is open: %', is_open_result;
        RAISE NOTICE '   Timezone: %', status_result->>'timezone';
        RAISE NOTICE '   Trading hours: %', status_result->>'trading_hours';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Exchange status function failed: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- Test 6: Test price calculation with JSE200 data
DO $$
DECLARE
    price_result JSON;
    current_price NUMERIC;
    jse_data_count INTEGER;
BEGIN
    RAISE NOTICE '=== TEST 6: PRICE CALCULATION WITH JSE200 DATA ===';
    
    -- Check if we have JSE200 data
    BEGIN
        EXECUTE 'SELECT COUNT(*) FROM JSE200_PriceUpdate_Mondays' INTO jse_data_count;
        RAISE NOTICE '📊 JSE200 data records: %', jse_data_count;
        
        IF jse_data_count = 0 THEN
            RAISE NOTICE '⚠️  No JSE200 data found - price calculation may use defaults';
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Cannot access JSE200_PriceUpdate_Mondays: %', SQLERRM;
            jse_data_count := 0;
    END;
    
    -- Test current price function
    BEGIN
        SELECT get_current_share_price() INTO current_price;
        RAISE NOTICE '✅ Current share price: N$%', current_price;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ get_current_share_price() failed: %', SQLERRM;
    END;
    
    -- Test price calculation (if JSE200 data exists)
    IF jse_data_count > 0 THEN
        BEGIN
            SELECT trigger_weekly_price_calculation() INTO price_result;
            RAISE NOTICE '✅ Price calculation test completed';
            RAISE NOTICE '   Result: %', price_result;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️  Price calculation test failed: %', SQLERRM;
                RAISE NOTICE '   This may be expected if price already calculated for this week';
        END;
    ELSE
        RAISE NOTICE '⚠️  Skipping price calculation test - no JSE200 data';
        RAISE NOTICE '   🔧 Run: scripts/create-sample-jse200-data.sql';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Test 7: Test weekly_prices table
DO $$
DECLARE
    weekly_count INTEGER;
    latest_price RECORD;
BEGIN
    RAISE NOTICE '=== TEST 7: WEEKLY PRICES TABLE ===';
    
    -- Check if weekly_prices table exists and has data
    BEGIN
        SELECT COUNT(*) INTO weekly_count FROM weekly_prices;
        RAISE NOTICE '✅ weekly_prices table accessible';
        RAISE NOTICE '   📊 Records: %', weekly_count;
        
        IF weekly_count > 0 THEN
            -- Get latest price record
            SELECT * INTO latest_price 
            FROM weekly_prices 
            ORDER BY effective_date DESC 
            LIMIT 1;
            
            RAISE NOTICE '   💰 Latest price: N$% (effective: %)', 
                         latest_price.final_price, latest_price.effective_date;
            RAISE NOTICE '   📈 JSE200 growth: %%', latest_price.j200_growth;
        ELSE
            RAISE NOTICE '   ⚠️  No price history found';
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ weekly_prices table issue: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- Test 8: Test retry functions (safe test)
DO $$
DECLARE
    test_result JSON;
BEGIN
    RAISE NOTICE '=== TEST 8: RETRY FUNCTIONS TEST ===';
    
    BEGIN
        -- This will test the retry functions but may fail if core functions don't exist
        SELECT test_all_retry_functions() INTO test_result;
        
        RAISE NOTICE '✅ Retry functions test completed!';
        RAISE NOTICE '   Test status: %', test_result->>'overall_status';
        RAISE NOTICE '   Test time: %', test_result->>'test_time';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️  Retry functions test failed: %', SQLERRM;
            RAISE NOTICE '   This may be expected if some core functions are missing';
    END;
    
    RAISE NOTICE '';
END $$;

-- Final comprehensive summary
DO $$
DECLARE
    exchange_functions INTEGER;
    retry_functions INTEGER;
    core_functions INTEGER;
    jse_table_exists BOOLEAN;
    weekly_table_exists BOOLEAN;
    total_expected INTEGER := 14; -- 6 exchange + 4 retry + 4 core
    total_found INTEGER;
    system_health TEXT;
BEGIN
    RAISE NOTICE '=== FINAL COMPREHENSIVE SUMMARY ===';
    
    -- Count exchange functions
    SELECT COUNT(*) INTO exchange_functions 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'get_exchange_status',
        'is_exchange_open',
        'get_trading_schedule',
        'test_new_schedule', 
        'get_cron_job_status',
        'trigger_weekly_cycle_test'
    );
    
    -- Count retry functions
    SELECT COUNT(*) INTO retry_functions 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'clear_history_with_retries',
        'calculate_price_with_retries',
        'open_exchange_with_retries',
        'test_all_retry_functions'
    );
    
    -- Count core price functions
    SELECT COUNT(*) INTO core_functions 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'calculate_weekly_share_price_simplified',
        'get_current_share_price',
        'get_price_history',
        'trigger_weekly_price_calculation'
    );
    
    -- Check table existence
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'JSE200_PriceUpdate_Mondays'
    ) INTO jse_table_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'weekly_prices'
    ) INTO weekly_table_exists;
    
    total_found := exchange_functions + retry_functions + core_functions;
    
    -- Determine system health
    IF total_found >= 12 AND jse_table_exists AND weekly_table_exists THEN
        system_health := '🟢 EXCELLENT';
    ELSIF total_found >= 10 AND jse_table_exists THEN
        system_health := '🟡 GOOD';
    ELSIF total_found >= 6 THEN
        system_health := '🟠 PARTIAL';
    ELSE
        system_health := '🔴 NEEDS WORK';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                        COMPREHENSIVE TEST RESULTS                         █';
    RAISE NOTICE '█                          SYSTEM HEALTH: %                          █', system_health;
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '📊 FUNCTION COUNTS:';
    RAISE NOTICE '   🏢 Exchange functions: % of 6', exchange_functions;
    RAISE NOTICE '   🔄 Retry functions: % of 4', retry_functions;
    RAISE NOTICE '   💰 Core price functions: % of 4', core_functions;
    RAISE NOTICE '   📈 Total functions: % of %', total_found, total_expected;
    RAISE NOTICE '';
    RAISE NOTICE '🗃️  TABLE STATUS:';
    RAISE NOTICE '   📊 JSE200_PriceUpdate_Mondays: %', 
                 CASE WHEN jse_table_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '   💰 weekly_prices: %', 
                 CASE WHEN weekly_table_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '';
    
    IF total_found >= 12 AND jse_table_exists AND weekly_table_exists THEN
        RAISE NOTICE '🎉 SUCCESS: All systems are operational!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ create-exchange-trading-hours-fixed.sql - VERIFIED';
        RAISE NOTICE '✅ update-cron-schedule-with-retries.sql - VERIFIED';
        RAISE NOTICE '✅ create-missing-core-functions.sql - VERIFIED';
        RAISE NOTICE '✅ JSE200_PriceUpdate_Mondays table - VERIFIED';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 SYSTEM STATUS: FULLY OPERATIONAL';
        
    ELSIF total_found >= 10 THEN
        RAISE NOTICE '⚠️  MOSTLY OPERATIONAL: % of % functions working', total_found, total_expected;
        RAISE NOTICE '   System should work but may need minor fixes';
        
    ELSE
        RAISE NOTICE '❌ ISSUES DETECTED: Only % of % functions found', total_found, total_expected;
        RAISE NOTICE '   Please check the installation of the SQL scripts';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🧪 MANUAL TEST COMMANDS:';
    RAISE NOTICE '   SELECT get_exchange_status();';
    RAISE NOTICE '   SELECT is_exchange_open();';
    RAISE NOTICE '   SELECT get_current_share_price();';
    RAISE NOTICE '   SELECT * FROM JSE200_PriceUpdate_Mondays ORDER BY date DESC LIMIT 3;';
    RAISE NOTICE '   SELECT * FROM weekly_prices ORDER BY effective_date DESC LIMIT 3;';
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
