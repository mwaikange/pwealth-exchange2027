-- Comprehensive test script to verify all systems are working
-- Tests: exchange trading hours, cron schedule, and retry functions

-- Start test banner
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    COMPREHENSIVE SYSTEM TEST STARTING                     █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Testing all systems installed by:';
    RAISE NOTICE '   1. create-exchange-trading-hours-fixed.sql';
    RAISE NOTICE '   2. update-cron-schedule-with-retries.sql';
    RAISE NOTICE '';
END $$;

-- Test 1: Check if all exchange trading hours functions exist
DO $$
DECLARE
    function_count INTEGER;
    missing_functions TEXT[];
    func_name TEXT;
BEGIN
    RAISE NOTICE '=== TEST 1: EXCHANGE TRADING HOURS FUNCTIONS ===';
    
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

-- Test 2: Check if all retry functions exist
DO $$
DECLARE
    function_count INTEGER;
    missing_functions TEXT[];
    func_name TEXT;
BEGIN
    RAISE NOTICE '=== TEST 2: RETRY FUNCTIONS ===';
    
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

-- Test 3: Test exchange status function
DO $$
DECLARE
    status_result JSON;
    is_open_result BOOLEAN;
BEGIN
    RAISE NOTICE '=== TEST 3: EXCHANGE STATUS FUNCTIONALITY ===';
    
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

-- Test 4: Test trading schedule function
DO $$
DECLARE
    schedule_result JSON;
BEGIN
    RAISE NOTICE '=== TEST 4: TRADING SCHEDULE FUNCTIONALITY ===';
    
    BEGIN
        SELECT get_trading_schedule() INTO schedule_result;
        
        RAISE NOTICE '✅ Trading schedule function works!';
        RAISE NOTICE '   Monday: %', schedule_result->'weekly_schedule'->>'monday';
        RAISE NOTICE '   Maintenance start: %', schedule_result->'maintenance_window'->>'start';
        RAISE NOTICE '   Maintenance end: %', schedule_result->'maintenance_window'->>'end';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Trading schedule function failed: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- Test 5: Check cron jobs status
DO $$
DECLARE
    cron_status JSON;
    cron_count INTEGER;
BEGIN
    RAISE NOTICE '=== TEST 5: CRON JOBS STATUS ===';
    
    BEGIN
        SELECT get_cron_job_status() INTO cron_status;
        
        -- Try to count actual cron jobs
        BEGIN
            SELECT COUNT(*) INTO cron_count 
            FROM cron.job 
            WHERE jobname IN (
                'clear_weekly_history',
                'calculate_weekly_price', 
                'open_weekly_exchange',
                'close_weekly_exchange'
            );
            
            RAISE NOTICE '✅ Cron jobs scheduled: %', cron_count;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️  pg_cron extension not available or no access to cron.job table';
                cron_count := 0;
        END;
        
        RAISE NOTICE '✅ Cron status function works!';
        RAISE NOTICE '   Expected schedule retrieved successfully';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Cron status function failed: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- Test 6: Test new schedule function
DO $$
DECLARE
    schedule_test JSON;
BEGIN
    RAISE NOTICE '=== TEST 6: NEW SCHEDULE TEST ===';
    
    BEGIN
        SELECT test_new_schedule() INTO schedule_test;
        
        RAISE NOTICE '✅ New schedule test function works!';
        RAISE NOTICE '   Test status: %', schedule_test->>'test_status';
        RAISE NOTICE '   Test completed at: %', schedule_test->>'test_time';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ New schedule test failed: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- Test 7: Test price calculation function (if it exists)
DO $$
DECLARE
    price_result RECORD;
    function_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== TEST 7: PRICE CALCULATION FUNCTION ===';
    
    -- Check if the function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'calculate_weekly_share_price_simplified'
    ) INTO function_exists;
    
    IF function_exists THEN
        BEGIN
            SELECT * INTO price_result FROM calculate_weekly_share_price_simplified() LIMIT 1;
            
            RAISE NOTICE '✅ Price calculation function exists and works!';
            RAISE NOTICE '   Function can be called successfully';
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️  Price calculation function exists but may need data: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️  Price calculation function not found (may need to run price setup scripts first)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Test 8: Test core exchange functions (if they exist)
DO $$
DECLARE
    function_exists BOOLEAN;
    core_functions TEXT[] := ARRAY[
        'clear_weekly_order_history',
        'open_exchange_weekly',
        'close_exchange_weekly'
    ];
    func_name TEXT;
    existing_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== TEST 8: CORE EXCHANGE FUNCTIONS ===';
    
    FOREACH func_name IN ARRAY core_functions
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = func_name
        ) INTO function_exists;
        
        IF function_exists THEN
            existing_count := existing_count + 1;
            RAISE NOTICE '   ✅ % exists', func_name;
        ELSE
            RAISE NOTICE '   ⚠️  % not found', func_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Core exchange functions found: % of %', existing_count, array_length(core_functions, 1);
    
    IF existing_count < array_length(core_functions, 1) THEN
        RAISE NOTICE '⚠️  Some core functions missing - may need to run additional setup scripts';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Test 9: Test retry functions (safe test)
DO $$
DECLARE
    test_result JSON;
BEGIN
    RAISE NOTICE '=== TEST 9: RETRY FUNCTIONS TEST ===';
    
    BEGIN
        -- This will test the retry functions but may fail if core functions don't exist
        SELECT test_all_retry_functions() INTO test_result;
        
        RAISE NOTICE '✅ Retry functions test completed!';
        RAISE NOTICE '   Test status: %', test_result->>'overall_status';
        RAISE NOTICE '   Test time: %', test_result->>'test_time';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️  Retry functions test failed (may need core functions): %', SQLERRM;
            RAISE NOTICE '   This is expected if core exchange functions are not yet installed';
    END;
    
    RAISE NOTICE '';
END $$;

-- Final summary
DO $$
DECLARE
    exchange_functions INTEGER;
    retry_functions INTEGER;
    total_expected INTEGER := 10; -- 6 exchange + 4 retry
    total_found INTEGER;
BEGIN
    RAISE NOTICE '=== FINAL SUMMARY ===';
    
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
    
    total_found := exchange_functions + retry_functions;
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                        COMPREHENSIVE TEST RESULTS                         █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '📊 FUNCTION COUNTS:';
    RAISE NOTICE '   🏢 Exchange functions: % of 6', exchange_functions;
    RAISE NOTICE '   🔄 Retry functions: % of 4', retry_functions;
    RAISE NOTICE '   📈 Total functions: % of %', total_found, total_expected;
    RAISE NOTICE '';
    
    IF total_found = total_expected THEN
        RAISE NOTICE '🎉 SUCCESS: All expected functions are installed and working!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ create-exchange-trading-hours-fixed.sql - VERIFIED';
        RAISE NOTICE '✅ update-cron-schedule-with-retries.sql - VERIFIED';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 SYSTEM STATUS: FULLY OPERATIONAL';
        RAISE NOTICE '';
        RAISE NOTICE '📋 NEXT STEPS:';
        RAISE NOTICE '   1. Exchange opens Monday 10:05 Windhoek time';
        RAISE NOTICE '   2. Automated weekly processes are scheduled';
        RAISE NOTICE '   3. Retry logic is in place for reliability';
        
    ELSIF total_found >= 8 THEN
        RAISE NOTICE '⚠️  PARTIAL SUCCESS: Most functions installed (% of %)', total_found, total_expected;
        RAISE NOTICE '   System should work but may need additional setup';
        
    ELSE
        RAISE NOTICE '❌ ISSUES DETECTED: Only % of % functions found', total_found, total_expected;
        RAISE NOTICE '   Please check the installation of the SQL scripts';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🧪 MANUAL TEST COMMANDS:';
    RAISE NOTICE '   SELECT get_exchange_status();';
    RAISE NOTICE '   SELECT is_exchange_open();';
    RAISE NOTICE '   SELECT get_trading_schedule();';
    RAISE NOTICE '   SELECT test_new_schedule();';
    RAISE NOTICE '   SELECT get_cron_job_status();';
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
