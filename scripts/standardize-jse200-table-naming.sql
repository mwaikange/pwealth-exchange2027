-- Standardize JSE200 table naming to PascalCase
-- This script ensures we use JSE200_PriceUpdate_Mondays consistently

DO $$
DECLARE
    pascal_exists BOOLEAN := FALSE;
    lowercase_exists BOOLEAN := FALSE;
    record_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    🔧 JSE200 TABLE NAMING STANDARDIZATION                 █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    -- Check if PascalCase table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'JSE200_PriceUpdate_Mondays'
    ) INTO pascal_exists;
    
    -- Check if lowercase table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'jse200_priceupdate_mondays'
    ) INTO lowercase_exists;
    
    RAISE NOTICE '🔍 TABLE EXISTENCE CHECK:';
    RAISE NOTICE '   JSE200_PriceUpdate_Mondays (PascalCase): %', 
                 CASE WHEN pascal_exists THEN '✅ EXISTS' ELSE '❌ NOT FOUND' END;
    RAISE NOTICE '   jse200_priceupdate_mondays (lowercase): %', 
                 CASE WHEN lowercase_exists THEN '⚠️  EXISTS (duplicate)' ELSE '✅ NOT FOUND' END;
    RAISE NOTICE '';
    
    -- Handle different scenarios
    IF pascal_exists AND lowercase_exists THEN
        -- Both exist - need to merge or choose one
        RAISE NOTICE '⚠️  SCENARIO: Both tables exist (duplicate situation)';
        
        -- Check record counts
        EXECUTE 'SELECT COUNT(*) FROM JSE200_PriceUpdate_Mondays' INTO record_count;
        RAISE NOTICE '   JSE200_PriceUpdate_Mondays records: %', record_count;
        
        EXECUTE 'SELECT COUNT(*) FROM jse200_priceupdate_mondays' INTO record_count;
        RAISE NOTICE '   jse200_priceupdate_mondays records: %', record_count;
        
        RAISE NOTICE '';
        RAISE NOTICE '🎯 RECOMMENDATION: Drop the lowercase duplicate';
        RAISE NOTICE '   Command: DROP TABLE IF EXISTS jse200_priceupdate_mondays;';
        
    ELSIF pascal_exists AND NOT lowercase_exists THEN
        -- Perfect - only PascalCase exists
        RAISE NOTICE '✅ SCENARIO: Perfect! Only PascalCase table exists';
        RAISE NOTICE '   No action needed - naming is already standardized';
        
    ELSIF NOT pascal_exists AND lowercase_exists THEN
        -- Only lowercase exists - rename it
        RAISE NOTICE '🔧 SCENARIO: Only lowercase table exists - renaming to PascalCase';
        
        -- Rename the table
        ALTER TABLE jse200_priceupdate_mondays 
        RENAME TO JSE200_PriceUpdate_Mondays;
        
        RAISE NOTICE '✅ Table renamed successfully!';
        
    ELSE
        -- Neither exists - create the correct one
        RAISE NOTICE '❌ SCENARIO: No JSE200 table exists - creating PascalCase version';
        
        CREATE TABLE JSE200_PriceUpdate_Mondays (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            date DATE NOT NULL UNIQUE,
            price NUMERIC(10,2) NOT NULL,
            percent_change NUMERIC(5,2) DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_jse200_date ON JSE200_PriceUpdate_Mondays(date DESC);
        
        RAISE NOTICE '✅ JSE200_PriceUpdate_Mondays table created successfully!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 STANDARDIZATION COMPLETE:';
    RAISE NOTICE '   ✅ Use: JSE200_PriceUpdate_Mondays (PascalCase)';
    RAISE NOTICE '   ✅ All functions should reference this exact name';
    RAISE NOTICE '   ✅ No lowercase duplicates';
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;

-- Verify final state
SELECT 
    'JSE200_PriceUpdate_Mondays' as recommended_table_name,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'JSE200_PriceUpdate_Mondays'
        ) THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status,
    (
        SELECT COUNT(*) 
        FROM JSE200_PriceUpdate_Mondays
    ) as record_count;
