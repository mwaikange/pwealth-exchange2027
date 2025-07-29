-- Simple verification without complex formatting
-- Check if everything is working correctly

DO $$
DECLARE
    status_result JSON;
    current_price NUMERIC;
    table_exists BOOLEAN;
    column_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Verifying database consistency...';
    
    -- Check if exchange_status table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'exchange_status'
    ) INTO table_exists;
    
    RAISE NOTICE 'exchange_status table exists: %', table_exists;
    
    -- Check if is_trading_open column exists
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'exchange_status' 
        AND column_name = 'is_trading_open'
    ) INTO column_exists;
    
    RAISE NOTICE 'is_trading_open column exists: %', column_exists;
    
    -- Test exchange status function
    BEGIN
        SELECT get_exchange_status() INTO status_result;
        RAISE NOTICE 'Exchange status function works: YES';
        RAISE NOTICE 'Trading open: %', status_result->>'is_trading_open';
        RAISE NOTICE 'Status message: %', status_result->>'status_message';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Exchange status function ERROR: %', SQLERRM;
    END;
    
    -- Test price function
    BEGIN
        SELECT get_current_share_price() INTO current_price;
        RAISE NOTICE 'Price function works: YES';
        RAISE NOTICE 'Current price: N$%', current_price;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Price function ERROR: %', SQLERRM;
    END;
    
    -- Test is_exchange_open function
    BEGIN
        DECLARE
            is_open BOOLEAN;
        BEGIN
            SELECT is_exchange_open() INTO is_open;
            RAISE NOTICE 'is_exchange_open function works: YES';
            RAISE NOTICE 'Exchange open: %', is_open;
        END;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'is_exchange_open function ERROR: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Verification completed';
END $$;
