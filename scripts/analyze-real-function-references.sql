-- Analyze which functions reference JSE200 table and need updating
-- Simple output, no fancy formatting

DO $$
DECLARE
    func_record RECORD;
    function_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'ANALYZING FUNCTION REFERENCES TO JSE200 TABLE';
    RAISE NOTICE '================================================';
    
    -- Check for functions that might reference JSE200 table
    FOR func_record IN 
        SELECT 
            p.proname as function_name,
            pg_get_functiondef(p.oid) as function_definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (
            pg_get_functiondef(p.oid) ILIKE '%jse200%' OR
            pg_get_functiondef(p.oid) ILIKE '%JSE200%'
        )
    LOOP
        function_count := function_count + 1;
        RAISE NOTICE 'Function: %', func_record.function_name;
        
        -- Check which table reference it uses
        IF func_record.function_definition ILIKE '%JSE200_PriceUpdate_Mondays%' THEN
            RAISE NOTICE '  - Uses PascalCase: JSE200_PriceUpdate_Mondays';
        END IF;
        
        IF func_record.function_definition ILIKE '%jse200_priceupdate_mondays%' THEN
            RAISE NOTICE '  - Uses lowercase: jse200_priceupdate_mondays';
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE 'Total functions found: %', function_count;
    RAISE NOTICE 'Analysis complete.';
END $$;
