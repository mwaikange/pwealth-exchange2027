-- Create the JSE200 table with the correct naming based on analysis
-- This script will make the final decision on naming convention

DO $$
DECLARE
    pascal_table_exists BOOLEAN := FALSE;
    lowercase_table_exists BOOLEAN := FALSE;
    function_uses_lowercase BOOLEAN := FALSE;
    function_uses_quoted BOOLEAN := FALSE;
    decision TEXT;
    final_table_name TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    🎯 JSE200 TABLE NAMING DECISION                        █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    -- Check current table existence
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'JSE200_PriceUpdate_Mondays'
    ) INTO pascal_table_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'jse200_priceupdate_mondays'
    ) INTO lowercase_table_exists;
    
    -- Check if functions expect lowercase (by looking for common function)
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'calculate_weekly_share_price_simplified'
        AND pg_get_functiondef(p.oid) ILIKE '%jse200_priceupdate_mondays%'
    ) INTO function_uses_lowercase;
    
    -- Check if functions use quoted identifiers
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'calculate_weekly_share_price_simplified'
        AND pg_get_functiondef(p.oid) ILIKE '%"JSE200_PriceUpdate_Mondays"%'
    ) INTO function_uses_quoted;
    
    RAISE NOTICE '🔍 CURRENT STATE ANALYSIS:';
    RAISE NOTICE '   JSE200_PriceUpdate_Mondays exists: %', pascal_table_exists;
    RAISE NOTICE '   jse200_priceupdate_mondays exists: %', lowercase_table_exists;
    RAISE NOTICE '   Functions use lowercase: %', function_uses_lowercase;
    RAISE NOTICE '   Functions use quoted PascalCase: %', function_uses_quoted;
    RAISE NOTICE '';
    
    -- Make decision based on current state
    IF function_uses_lowercase THEN
        decision := 'USE_LOWERCASE';
        final_table_name := 'jse200_priceupdate_mondays';
        RAISE NOTICE '🎯 DECISION: Use lowercase table name';
        RAISE NOTICE '   Reason: Existing functions expect lowercase';
        
    ELSIF function_uses_quoted THEN
        decision := 'USE_QUOTED_PASCAL';
        final_table_name := 'JSE200_PriceUpdate_Mondays';
        RAISE NOTICE '🎯 DECISION: Use quoted PascalCase table name';
        RAISE NOTICE '   Reason: Existing functions use quoted identifiers';
        
    ELSIF pascal_table_exists AND NOT lowercase_table_exists THEN
        decision := 'CONVERT_TO_LOWERCASE';
        final_table_name := 'jse200_priceupdate_mondays';
        RAISE NOTICE '🎯 DECISION: Convert PascalCase to lowercase';
        RAISE NOTICE '   Reason: Simpler for PostgreSQL, no quotes needed';
        
    ELSIF lowercase_table_exists AND NOT pascal_table_exists THEN
        decision := 'KEEP_LOWERCASE';
        final_table_name := 'jse200_priceupdate_mondays';
        RAISE NOTICE '🎯 DECISION: Keep existing lowercase table';
        RAISE NOTICE '   Reason: Already exists in correct format';
        
    ELSE
        decision := 'CREATE_LOWERCASE';
        final_table_name := 'jse200_priceupdate_mondays';
        RAISE NOTICE '🎯 DECISION: Create new lowercase table';
        RAISE NOTICE '   Reason: Simplest approach for PostgreSQL';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 EXECUTING DECISION: %', decision;
    RAISE NOTICE '';
    
    -- Execute the decision
    CASE decision
        WHEN 'USE_LOWERCASE' THEN
            RAISE NOTICE '✅ Functions already expect lowercase - no table changes needed';
            
        WHEN 'USE_QUOTED_PASCAL' THEN
            RAISE NOTICE '✅ Functions use quoted identifiers - no table changes needed';
            
        WHEN 'CONVERT_TO_LOWERCASE' THEN
            RAISE NOTICE '🔄 Converting PascalCase table to lowercase...';
            ALTER TABLE "JSE200_PriceUpdate_Mondays" RENAME TO jse200_priceupdate_mondays;
            RAISE NOTICE '✅ Table renamed to lowercase';
            
        WHEN 'KEEP_LOWERCASE' THEN
            RAISE NOTICE '✅ Lowercase table already exists - no changes needed';
            
        WHEN 'CREATE_LOWERCASE' THEN
            RAISE NOTICE '🆕 Creating new lowercase JSE200 table...';
            
            CREATE TABLE jse200_priceupdate_mondays (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                date DATE NOT NULL UNIQUE,
                price NUMERIC(10,2) NOT NULL,
                percent_change NUMERIC(5,2) DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Create index
            CREATE INDEX idx_jse200_date ON jse200_priceupdate_mondays(date DESC);
            
            -- Insert sample data
            INSERT INTO jse200_priceupdate_mondays (date, price, percent_change)
            VALUES 
                (CURRENT_DATE - INTERVAL '7 days', 1080.50, 1.2),
                (CURRENT_DATE - INTERVAL '14 days', 1067.20, -0.8),
                (CURRENT_DATE - INTERVAL '21 days', 1075.80, 2.1),
                (CURRENT_DATE - INTERVAL '28 days', 1054.30, -1.5)
            ON CONFLICT (date) DO NOTHING;
            
            RAISE NOTICE '✅ Created jse200_priceupdate_mondays with sample data';
    END CASE;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 FINAL RESULT:';
    RAISE NOTICE '   📋 Table name: %', final_table_name;
    RAISE NOTICE '   📝 Query format: SELECT * FROM %;', final_table_name;
    RAISE NOTICE '   🔧 All functions should reference: %', final_table_name;
    RAISE NOTICE '';
    
    -- Verify final state
    DECLARE
        final_exists BOOLEAN;
        record_count INTEGER;
    BEGIN
        EXECUTE format('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = ''public'' AND table_name = %L)', final_table_name) INTO final_exists;
        
        IF final_exists THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', final_table_name) INTO record_count;
            RAISE NOTICE '✅ VERIFICATION: Table % exists with % records', final_table_name, record_count;
        ELSE
            RAISE NOTICE '❌ VERIFICATION FAILED: Table % does not exist', final_table_name;
        END IF;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
