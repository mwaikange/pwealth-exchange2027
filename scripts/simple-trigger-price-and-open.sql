-- Simple script to trigger price calculation and open exchange
-- Fixed timezone handling to avoid "dow" errors

DO $$
DECLARE
    price_result JSON;
    open_result JSON;
    status_result JSON;
BEGIN
    RAISE NOTICE 'Starting price calculation and exchange opening...';
    
    -- Step 1: Calculate price
    BEGIN
        SELECT calculate_weekly_share_price_simplified() INTO price_result;
        
        IF (price_result->>'success')::BOOLEAN THEN
            RAISE NOTICE 'Price calculation SUCCESS - New price: N$%', price_result->>'final_price';
        ELSE
            RAISE NOTICE 'Price calculation FAILED: %', price_result->>'message';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Price calculation ERROR: %', SQLERRM;
    END;
    
    -- Step 2: Open exchange
    BEGIN
        SELECT open_exchange_weekly() INTO open_result;
        
        IF (open_result->>'success')::BOOLEAN THEN
            RAISE NOTICE 'Exchange opening SUCCESS - Trading is now OPEN';
        ELSE
            RAISE NOTICE 'Exchange opening FAILED: %', open_result->>'message';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Exchange opening ERROR: %', SQLERRM;
    END;
    
    -- Step 3: Verify status
    BEGIN
        SELECT get_exchange_status() INTO status_result;
        RAISE NOTICE 'Final status: %', status_result->>'status_message';
        RAISE NOTICE 'Trading open: %', status_result->>'is_trading_open';
        RAISE NOTICE 'Current price: N$%', status_result->>'current_price';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Status check ERROR: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Process completed!';
END $$;
