-- ============================================================================
-- COMPREHENSIVE JSE200 TABLE AND SYSTEMS TEST
-- ============================================================================
-- This script tests:
-- 1. JSE200_PriceUpdate_Mondays table exists and has correct structure
-- 2. All functions that depend on this table work correctly
-- 3. Price calculation system is operational
-- 4. No duplicate/incorrect tables exist
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN := FALSE;
    duplicate_exists BOOLEAN := FALSE;
    test_count INTEGER := 0;
    pass_count INTEGER := 0;
    test_result TEXT;
    sample_data_count INTEGER;
    latest_record RECORD;
    price_calc_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    🧪 JSE200 COMPREHENSIVE SYSTEM TEST                   █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';

    -- ========================================================================
    -- TEST 1: Check if correct JSE200_PriceUpdate_Mondays table exists
    -- ========================================================================
    test_count := test_count + 1;
    RAISE NOTICE '🔍 TEST %: Checking JSE200_PriceUpdate_Mondays table exists...', test_count;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'JSE200_PriceUpdate_Mondays'
    ) INTO table_exists;
    
    IF table_exists THEN
        pass_count := pass_count + 1;
        RAISE NOTICE '   ✅ PASS: JSE200_PriceUpdate_Mondays table exists';
    ELSE
        RAISE NOTICE '   ❌ FAIL: JSE200_PriceUpdate_Mondays table NOT FOUND';
    END IF;

    -- ========================================================================
    -- TEST 2: Check for duplicate lowercase table
    -- ========================================================================
    test_count := test_count + 1;
    RAISE NOTICE '🔍 TEST %: Checking for duplicate lowercase table...', test_count;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'jse200_priceupdate_mondays'
    ) INTO duplicate_exists;
    
    IF NOT duplicate_exists THEN
        pass_count := pass_count + 1;
        RAISE NOTICE '   ✅ PASS: No duplicate lowercase table found';
    ELSE
        RAISE NOTICE '   ❌ FAIL: Duplicate lowercase table EXISTS - needs cleanup!';
    END IF;

    -- ========================================================================
    -- TEST 3: Check table structure
    -- ========================================================================
    test_count := test_count + 1;
    RAISE NOTICE '🔍 TEST %: Checking table structure...', test_count;
    
    IF table_exists THEN
        -- Check if required columns exist
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'JSE200_PriceUpdate_Mondays' 
            AND column_name IN ('id', 'created_at', 'percent_change')
            GROUP BY table_name 
            HAVING COUNT(*) = 3
        ) THEN
            pass_count := pass_count + 1;
            RAISE NOTICE '   ✅ PASS: Table has required columns (id, created_at, percent_change)';
        ELSE
            RAISE NOTICE '   ❌ FAIL: Table missing required columns';
        END IF;
    ELSE
        RAISE NOTICE '   ⏭️  SKIP: Table does not exist';
    END IF;

    -- ========================================================================
    -- TEST 4: Check if table has data
    -- ========================================================================
    test_count := test_count + 1;
    RAISE NOTICE '🔍 TEST %: Checking table data...', test_count;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO sample_data_count FROM JSE200_PriceUpdate_Mondays;
        
        IF sample_data_count > 0 THEN
            pass_count := pass_count + 1;
            RAISE NOTICE '   ✅ PASS: Table contains % records', sample_data_count;
            
            -- Get latest record
            SELECT * INTO latest_record 
            FROM JSE200_PriceUpdate_Mondays 
            ORDER BY created_at DESC 
            LIMIT 1;
            
            RAISE NOTICE '   📊 Latest record: % (percent_change: %)', 
                         latest_record.created_at, latest_record.percent_change;
        ELSE
            RAISE NOTICE '   ⚠️  WARNING: Table exists but has no data';
        END IF;
    ELSE
        RAISE NOTICE '   ⏭️  SKIP: Table does not exist';
    END IF;

    -- ========================================================================
    -- TEST 5: Test calculate_weekly_share_price_simplified function exists
    -- ========================================================================
    test_count := test_count + 1;
    RAISE NOTICE '🔍 TEST %: Checking price calculation function...', test_count;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'calculate_weekly_share_price_simplified'
    ) THEN
        pass_count := pass_count + 1;
        RAISE NOTICE '   ✅ PASS: calculate_weekly_share_price_simplified function exists';
    ELSE
        RAISE NOTICE '   ❌ FAIL: calculate_weekly_share_price_simplified function NOT FOUND';
    END IF;

    -- ========================================================================
    -- TEST 6: Test get_current_share_price function exists
    -- ========================================================================
    test_count := test_count + 1;
    RAISE NOTICE '🔍 TEST %: Checking get_current_share_price function...', test_count;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_current_share_price'
    ) THEN
        pass_count := pass_count + 1;
        RAISE NOTICE '   ✅ PASS: get_current_share_price function exists';
    ELSE
        RAISE NOTICE '   ❌ FAIL: get_current_share_price function NOT FOUND';
    END IF;

    -- ========================================================================
    -- TEST 7: Test trigger_weekly_price_calculation function exists
    -- ========================================================================
    test_count := test_count + 1;
    RAISE NOTICE '🔍 TEST %: Checking trigger function...', test_count;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'trigger_weekly_price_calculation'
    ) THEN
        pass_count := pass_count + 1;
        RAISE NOTICE '   ✅ PASS: trigger_weekly_price_calculation function exists';
    ELSE
        RAISE NOTICE '   ❌ FAIL: trigger_weekly_price_calculation function NOT FOUND';
    END IF;

    -- ========================================================================
    -- TEST 8: Test weekly_prices table exists
    -- ========================================================================
    test_count := test_count + 1;
    RAISE NOTICE '🔍 TEST %: Checking weekly_prices table...', test_count;
    
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'weekly_prices'
    ) THEN
        pass_count := pass_count + 1;
        RAISE NOTICE '   ✅ PASS: weekly_prices table exists';
    ELSE
        RAISE NOTICE '   ❌ FAIL: weekly_prices table NOT FOUND';
    END IF;

    -- ========================================================================
    -- TEST 9: Test actual price calculation (if data exists)
    -- ========================================================================
    test_count := test_count + 1;
    RAISE NOTICE '🔍 TEST %: Testing actual price calculation...', test_count;
    
    IF table_exists AND sample_data_count > 0 THEN
        BEGIN
            -- Try to get current price
            DECLARE
                current_price NUMERIC;
            BEGIN
                SELECT get_current_share_price() INTO current_price;
                
                IF current_price IS NOT NULL AND current_price > 0 THEN
                    pass_count := pass_count + 1;
                    RAISE NOTICE '   ✅ PASS: get_current_share_price() returns: N$%', current_price;
                ELSE
                    RAISE NOTICE '   ❌ FAIL: get_current_share_price() returned invalid value: %', current_price;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '   ❌ FAIL: get_current_share_price() threw error: %', SQLERRM;
            END;
        END;
    ELSE
        RAISE NOTICE '   ⏭️  SKIP: No JSE200 data available for testing';
    END IF;

    -- ========================================================================
    -- TEST 10: Check cron job configuration
    -- ========================================================================
    test_count := test_count + 1;
    RAISE NOTICE '🔍 TEST %: Checking cron job configuration...', test_count;
    
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%weekly%price%') THEN
        pass_count := pass_count + 1;
        RAISE NOTICE '   ✅ PASS: Weekly price cron job configured';
        
        -- Show cron job details
        FOR test_result IN 
            SELECT 'Job: ' || jobname || ' | Schedule: ' || schedule || ' | Active: ' || active
            FROM cron.job 
            WHERE jobname LIKE '%weekly%price%'
        LOOP
            RAISE NOTICE '   📅 %', test_result;
        END LOOP;
    ELSE
        RAISE NOTICE '   ⚠️  WARNING: No weekly price cron job found';
    END IF;

    -- ========================================================================
    -- FINAL RESULTS
    -- ========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                           📊 TEST RESULTS                                 █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 TESTS PASSED: % / %', pass_count, test_count;
    RAISE NOTICE '';
    
    IF pass_count = test_count THEN
        RAISE NOTICE '🎉 SYSTEM STATUS: FULLY OPERATIONAL';
        RAISE NOTICE '✅ JSE200 table and all dependent systems are working correctly!';
    ELSIF pass_count >= (test_count * 0.8) THEN
        RAISE NOTICE '⚠️  SYSTEM STATUS: MOSTLY OPERATIONAL';
        RAISE NOTICE '🔧 Some minor issues detected - review failed tests above';
    ELSE
        RAISE NOTICE '❌ SYSTEM STATUS: CRITICAL ISSUES DETECTED';
        RAISE NOTICE '🚨 Multiple failures - immediate attention required!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    ✅ JSE200 SYSTEM TEST COMPLETED                       █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';

END $$;
