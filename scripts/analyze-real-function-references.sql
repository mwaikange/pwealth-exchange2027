-- Analyze how JSE200 table is actually referenced in existing functions
-- This will tell us if we need quoted identifiers or should use lowercase

DO $$
DECLARE
    func_def TEXT;
    func_name TEXT;
    pascal_refs INTEGER := 0;
    lowercase_refs INTEGER := 0;
    quoted_refs INTEGER := 0;
    unquoted_pascal_refs INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    🔍 REAL FUNCTION REFERENCE ANALYSIS                    █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    RAISE NOTICE '🔍 ANALYZING FUNCTION DEFINITIONS FOR JSE200 TABLE REFERENCES...';
    RAISE NOTICE '';
    
    -- Check each function that might reference JSE200 table
    FOR func_name IN 
        SELECT p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND (
            p.proname LIKE '%price%' OR 
            p.proname LIKE '%jse%' OR
            p.proname LIKE '%weekly%' OR
            p.proname = 'calculate_weekly_share_price_simplified'
        )
        ORDER BY p.proname
    LOOP
        -- Get function definition
        SELECT pg_get_functiondef(p.oid) INTO func_def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = func_name;
        
        RAISE NOTICE '📋 Function: %', func_name;
        
        -- Check for different reference patterns
        IF func_def ILIKE '%"JSE200_PriceUpdate_Mondays"%' THEN
            quoted_refs := quoted_refs + 1;
            RAISE NOTICE '   ✅ Uses QUOTED PascalCase: "JSE200_PriceUpdate_Mondays"';
            
        ELSIF func_def ILIKE '%JSE200_PriceUpdate_Mondays%' THEN
            unquoted_pascal_refs := unquoted_pascal_refs + 1;
            RAISE NOTICE '   ⚠️  Uses UNQUOTED PascalCase: JSE200_PriceUpdate_Mondays';
            RAISE NOTICE '      🔧 This will be converted to lowercase by PostgreSQL!';
            
        ELSIF func_def ILIKE '%jse200_priceupdate_mondays%' THEN
            lowercase_refs := lowercase_refs + 1;
            RAISE NOTICE '   📝 Uses lowercase: jse200_priceupdate_mondays';
            
        ELSE
            RAISE NOTICE '   ❌ No JSE200 table reference found';
        END IF;
        
        -- Show relevant parts of function definition
        IF func_def ILIKE '%jse200%' OR func_def ILIKE '%JSE200%' THEN
            RAISE NOTICE '   📄 Relevant code snippet:';
            -- Extract lines containing JSE200 references
            DECLARE
                line TEXT;
                lines TEXT[];
                i INTEGER;
            BEGIN
                lines := string_to_array(func_def, E'\n');
                FOR i IN 1..array_length(lines, 1) LOOP
                    line := lines[i];
                    IF line ILIKE '%jse200%' OR line ILIKE '%JSE200%' THEN
                        RAISE NOTICE '      %', trim(line);
                    END IF;
                END LOOP;
            END;
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '📊 REFERENCE SUMMARY:';
    RAISE NOTICE '   🔤 Quoted PascalCase ("JSE200_PriceUpdate_Mondays"): %', quoted_refs;
    RAISE NOTICE '   ⚠️  Unquoted PascalCase (JSE200_PriceUpdate_Mondays): %', unquoted_pascal_refs;
    RAISE NOTICE '   📝 Lowercase (jse200_priceupdate_mondays): %', lowercase_refs;
    RAISE NOTICE '';
    
    -- Provide recommendation
    IF quoted_refs > 0 THEN
        RAISE NOTICE '🎯 RECOMMENDATION: Keep PascalCase table, use quoted identifiers';
        RAISE NOTICE '   ✅ Table name: JSE200_PriceUpdate_Mondays';
        RAISE NOTICE '   ✅ Query format: SELECT * FROM "JSE200_PriceUpdate_Mondays";';
        RAISE NOTICE '   🔧 Update unquoted references to use quotes';
        
    ELSIF unquoted_pascal_refs > 0 THEN
        RAISE NOTICE '🎯 RECOMMENDATION: Either fix quotes OR rename to lowercase';
        RAISE NOTICE '   Option A: Keep PascalCase, add quotes everywhere';
        RAISE NOTICE '   Option B: Rename table to lowercase for simplicity';
        RAISE NOTICE '   ⚠️  Current unquoted PascalCase will NOT work!';
        
    ELSIF lowercase_refs > 0 THEN
        RAISE NOTICE '🎯 RECOMMENDATION: Use lowercase table name';
        RAISE NOTICE '   ✅ Table name: jse200_priceupdate_mondays';
        RAISE NOTICE '   ✅ Query format: SELECT * FROM jse200_priceupdate_mondays;';
        RAISE NOTICE '   🔧 Functions already expect lowercase';
        
    ELSE
        RAISE NOTICE '🎯 RECOMMENDATION: Create table and functions consistently';
        RAISE NOTICE '   💡 Suggest: lowercase for simplicity (jse200_priceupdate_mondays)';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
