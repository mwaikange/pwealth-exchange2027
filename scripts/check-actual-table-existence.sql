-- Check what JSE200 tables actually exist and their exact names
-- This will help determine the current state

DO $$
DECLARE
    table_record RECORD;
    table_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    📋 ACTUAL TABLE EXISTENCE CHECK                        █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    RAISE NOTICE '🔍 CHECKING ALL TABLES WITH "jse" IN THE NAME...';
    RAISE NOTICE '';
    
    -- Check for any tables containing 'jse' (case insensitive)
    FOR table_record IN 
        SELECT 
            table_name,
            table_schema,
            table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND LOWER(table_name) LIKE '%jse%'
        ORDER BY table_name
    LOOP
        table_count := table_count + 1;
        RAISE NOTICE '📋 Found table: %', table_record.table_name;
        RAISE NOTICE '   Schema: %', table_record.table_schema;
        RAISE NOTICE '   Type: %', table_record.table_type;
        
        -- Try to get record count
        DECLARE
            record_count INTEGER;
            sample_data TEXT;
        BEGIN
            -- Use dynamic SQL with proper quoting
            EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) INTO record_count;
            RAISE NOTICE '   Records: %', record_count;
            
            -- Get sample of latest record if any exist
            IF record_count > 0 THEN
                EXECUTE format('SELECT date::TEXT FROM %I ORDER BY date DESC LIMIT 1', table_record.table_name) INTO sample_data;
                RAISE NOTICE '   Latest date: %', sample_data;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '   ⚠️  Could not access table: %', SQLERRM;
        END;
        
        RAISE NOTICE '';
    END LOOP;
    
    IF table_count = 0 THEN
        RAISE NOTICE '❌ NO JSE200 TABLES FOUND!';
        RAISE NOTICE '   🔧 Need to create the table first';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '📊 TOTAL JSE200 TABLES FOUND: %', table_count;
    END IF;
    
    -- Also check for weekly_prices table
    RAISE NOTICE '🔍 CHECKING weekly_prices TABLE...';
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'weekly_prices'
    ) THEN
        DECLARE
            weekly_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO weekly_count FROM weekly_prices;
            RAISE NOTICE '✅ weekly_prices table exists with % records', weekly_count;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️  weekly_prices table exists but cannot access: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '❌ weekly_prices table NOT FOUND';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
