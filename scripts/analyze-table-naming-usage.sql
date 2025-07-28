-- Analyze current JSE200 table naming usage across the codebase
-- This will help determine which naming convention to standardize on

DO $$
DECLARE
    pascal_case_usage TEXT[] := ARRAY[
        'JSE200_PriceUpdate_Mondays',
        'calculate_weekly_share_price_simplified()',
        'scripts/create-missing-core-functions.sql'
    ];
    lowercase_usage TEXT[] := ARRAY[
        'jse200_priceupdate_mondays',
        'Various SQL scripts',
        'Potential duplicate table'
    ];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    📋 TABLE NAMING ANALYSIS                               █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    RAISE NOTICE '🔍 CURRENT USAGE ANALYSIS:';
    RAISE NOTICE '';
    
    RAISE NOTICE '📝 PascalCase Usage (JSE200_PriceUpdate_Mondays):';
    RAISE NOTICE '   ✓ sql/create-simplified-price-calculation.sql';
    RAISE NOTICE '   ✓ scripts/create-missing-core-functions.sql';
    RAISE NOTICE '   ✓ calculate_weekly_share_price_simplified() function';
    RAISE NOTICE '   ✓ Most recent SQL scripts';
    RAISE NOTICE '';
    
    RAISE NOTICE '📝 lowercase Usage (jse200_priceupdate_mondays):';
    RAISE NOTICE '   ⚠️  Potentially in older scripts';
    RAISE NOTICE '   ⚠️  May exist as duplicate table';
    RAISE NOTICE '   ⚠️  Inconsistent references';
    RAISE NOTICE '';
    
    RAISE NOTICE '🎯 RECOMMENDATION:';
    RAISE NOTICE '   Use: JSE200_PriceUpdate_Mondays (PascalCase)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 REASONS:';
    RAISE NOTICE '   1. Already used in main price calculation function';
    RAISE NOTICE '   2. More descriptive and readable';
    RAISE NOTICE '   3. Matches business terminology (JSE200)';
    RAISE NOTICE '   4. Consistent with recent codebase';
    RAISE NOTICE '';
    
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;

-- Check which tables actually exist
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'JSE200_PriceUpdate_Mondays' THEN '✅ PascalCase (RECOMMENDED)'
        WHEN table_name = 'jse200_priceupdate_mondays' THEN '⚠️  lowercase (should be renamed)'
        ELSE '❓ Other'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%jse200%'
ORDER BY table_name;
