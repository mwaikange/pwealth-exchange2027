-- Analyze how JSE200 table is actually referenced in existing functions
-- This will tell us if we need to update function definitions

DO $$
DECLARE
    func_def TEXT;
    func_name TEXT;
    pascal_refs INTEGER := 0;
    lowercase_refs INTEGER := 0;
    quoted_refs INTEGER := 0;
    unquoted_pascal_refs INTEGER := 0;
    functions_to_update TEXT[] := ARRAY[]::TEXT[];
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
            p.proname = 'calculate_weekly_share_price_simplified' OR
            p.proname = 'get_current_share_price' OR
            p.proname = 'trigger_weekly_price_calculation'
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
            functions_to_update := array_append(functions_to_update, func_name);
            RAISE NOTICE '   🔧 NEEDS UPDATE: Uses QUOTED PascalCase: "JSE200_PriceUpdate_Mondays"';
            
        ELSIF func_def ILIKE '%JSE200_PriceUpdate_Mondays%' THEN
            unquoted_pascal_refs := unquoted_pascal_refs + 1;
            functions_to_update := array_append(functions_to_update, func_name);
            RAISE NOTICE '   🔧 NEEDS UPDATE: Uses UNQUOTED PascalCase: JSE200_PriceUpdate_Mondays';
            RAISE NOTICE '      (PostgreSQL converts this to lowercase anyway)';
            
        ELSIF func_def ILIKE '%jse200_priceupdate_mondays%' THEN
            lowercase_refs := lowercase_refs + 1;
            RAISE NOTICE '   ✅ CORRECT: Already uses lowercase: jse200_priceupdate_mondays';
            
        ELSE
            RAISE NOTICE '   ❌ No JSE200 table reference found';
        END IF;
        
        -- Show relevant parts of function definition that need updating
        IF func_def ILIKE '%jse200%' OR func_def ILIKE '%JSE200%' THEN
            DECLARE
                line TEXT;
                lines TEXT[];
                i INTEGER;
            BEGIN
                lines := string_to_array(func_def, E'\n');
                FOR i IN 1..array_length(lines, 1) LOOP
                    line := lines[i];
                    IF line ILIKE '%jse200%' OR line ILIKE '%JSE200%' THEN
                        RAISE NOTICE '      📄 Code: %', trim(line);
                    END IF;
                END LOOP;
            END;
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '📊 REFERENCE SUMMARY:';
    RAISE NOTICE '   🔤 Quoted PascalCase ("JSE200_PriceUpdate_Mondays"): %', quoted_refs;
    RAISE NOTICE '   ⚠️  Unquoted PascalCase (JSE200_PriceUpdate_Mondays): %', unquoted_pascal_refs;
    RAISE NOTICE '   ✅ Lowercase (jse200_priceupdate_mondays): %', lowercase_refs;
    RAISE NOTICE '';
    
    -- Show functions that need updating
    IF array_length(functions_to_update, 1) > 0 THEN
        RAISE NOTICE '🔧 FUNCTIONS THAT NEED UPDATING:';
        FOR i IN 1..array_length(functions_to_update, 1) LOOP
            RAISE NOTICE '   - %', functions_to_update[i];
        END LOOP;
        RAISE NOTICE '';
        RAISE NOTICE '   These functions will be updated to use: jse200_priceupdate_mondays';
    ELSE
        RAISE NOTICE '✅ All functions already use correct lowercase references!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
