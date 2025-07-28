-- ============================================================================
-- CREATE SAMPLE JSE200 DATA FOR TESTING
-- ============================================================================
-- This script creates sample JSE200 data if the table is empty
-- Use this ONLY for testing purposes
-- ============================================================================

DO $$
DECLARE
    data_count INTEGER;
BEGIN
    -- Check if JSE200_PriceUpdate_Mondays table has data
    SELECT COUNT(*) INTO data_count FROM JSE200_PriceUpdate_Mondays;
    
    IF data_count = 0 THEN
        RAISE NOTICE '📊 Creating sample JSE200 data for testing...';
        
        -- Insert sample data for the last 4 weeks
        INSERT INTO JSE200_PriceUpdate_Mondays (id, created_at, percent_change) VALUES
        (gen_random_uuid(), NOW() - INTERVAL '3 weeks', 2.5),
        (gen_random_uuid(), NOW() - INTERVAL '2 weeks', -1.2),
        (gen_random_uuid(), NOW() - INTERVAL '1 week', 3.8),
        (gen_random_uuid(), NOW(), 1.5);
        
        RAISE NOTICE '✅ Sample JSE200 data created successfully!';
        RAISE NOTICE '📈 Data includes: +2.5%, -1.2%, +3.8%, +1.5%';
    ELSE
        RAISE NOTICE '📊 JSE200 table already contains % records - no sample data needed', data_count;
    END IF;
END $$;

-- Show the data
SELECT 
    created_at,
    percent_change,
    CASE 
        WHEN percent_change > 0 THEN '📈 Positive'
        WHEN percent_change < 0 THEN '📉 Negative'
        ELSE '➡️ Neutral'
    END as trend
FROM JSE200_PriceUpdate_Mondays 
ORDER BY created_at DESC;
