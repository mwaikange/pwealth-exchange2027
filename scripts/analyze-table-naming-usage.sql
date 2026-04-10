-- Analyze current JSE200 table naming usage across the database
-- This script checks for both naming conventions and their usage

DO $$
DECLARE
    pascal_exists BOOLEAN := FALSE;
    lowercase_exists BOOLEAN := FALSE;
    pascal_count INTEGER := 0;
    lowercase_count INTEGER := 0;
    function_refs TEXT[];
    view_refs TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    🔍 JSE200 TABLE NAMING ANALYSIS                        █';
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
    
    -- Get record counts if tables exist
    IF pascal_exists THEN
        EXECUTE 'SELECT COUNT(*) FROM JSE200_PriceUpdate_Mondays' INTO pascal_count;
    END IF;
    
    IF lowercase_exists THEN
        EXECUTE 'SELECT COUNT(*) FROM jse200_priceupdate_mondays' INTO lowercase_count;
    END IF;
    
    RAISE NOTICE '📊 TABLE EXISTENCE STATUS:';
    RAISE NOTICE '   JSE200_PriceUpdate_Mondays (PascalCase): %', 
                 CASE WHEN pascal_exists THEN '✅ EXISTS (' || pascal_count || ' records)' ELSE '❌ NOT FOUND' END;
    RAISE NOTICE '   jse200_priceupdate_mondays (lowercase): %', 
                 CASE WHEN lowercase_exists THEN '⚠️  EXISTS (' || lowercase_count || ' records)' ELSE '✅ NOT FOUND (good!)' END;
    RAISE NOTICE '';
    
    -- Check for function references
    SELECT array_agg(p.proname) INTO function_refs
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND (
        pg_get_functiondef(p.oid) ILIKE '%JSE200_PriceUpdate_Mondays%'
        OR pg_get_functiondef(p.oid) ILIKE '%jse200_priceupdate_mondays%'
    );
    
    IF function_refs IS NOT NULL THEN
        RAISE NOTICE '🔧 FUNCTIONS REFERENCING JSE200 TABLE:';
        FOR i IN 1..array_length(function_refs, 1) LOOP
            RAISE NOTICE '   - %', function_refs[i];
        END LOOP;
    ELSE
        RAISE NOTICE '🔧 FUNCTIONS: No functions found referencing JSE200 tables';
    END IF;
    
    RAISE NOTICE '';
    
    -- Check for view references
    SELECT array_agg(v.viewname) INTO view_refs
    FROM pg_views v
    WHERE v.schemaname = 'public'
    AND (
        v.definition ILIKE '%JSE200_PriceUpdate_Mondays%'
        OR v.definition ILIKE '%jse200_priceupdate_mondays%'
    );
    
    IF view_refs IS NOT NULL THEN
        RAISE NOTICE '👁️  VIEWS REFERENCING JSE200 TABLE:';
        FOR i IN 1..array_length(view_refs, 1) LOOP
            RAISE NOTICE '   - %', view_refs[i];
        END LOOP;
    ELSE
        RAISE NOTICE '👁️  VIEWS: No views found referencing JSE200 tables';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RECOMMENDATION:';
    IF pascal_exists AND NOT lowercase_exists THEN
        RAISE NOTICE '   ✅ Perfect! Only PascalCase table exists';
        RAISE NOTICE '   ✅ Continue using: JSE200_PriceUpdate_Mondays';
    ELSIF pascal_exists AND lowercase_exists THEN
        RAISE NOTICE '   ⚠️  Both tables exist - drop lowercase duplicate';
        RAISE NOTICE '   📝 Command: DROP TABLE jse200_priceupdate_mondays;';
    ELSIF NOT pascal_exists AND lowercase_exists THEN
        RAISE NOTICE '   🔧 Rename lowercase to PascalCase';
        RAISE NOTICE '   📝 Command: ALTER TABLE jse200_priceupdate_mondays RENAME TO JSE200_PriceUpdate_Mondays;';
    ELSE
        RAISE NOTICE '   ❌ No JSE200 table found - need to create one';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
