-- Complete price calculation and exchange opening script
-- Simulates the full Monday morning process using UTC+2 timezone

DO $$
DECLARE
    cleanup_result JSON;
    price_result JSON;
    open_result JSON;
    current_price NUMERIC;
    exchange_status JSON;
    windhoek_time TIMESTAMP;
BEGIN
    -- Get current Windhoek time (UTC+2)
    windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    
    RAISE NOTICE 'FULL MONDAY MORNING PROCESS SIMULATION';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Current UTC time: %', NOW() AT TIME ZONE 'UTC';
    RAISE NOTICE 'Current Windhoek time (UTC+2): %', windhoek_time;
    RAISE NOTICE 'Simulating: 09:30 cleanup -> 10:03 price calc -> 10:05 open';
    RAISE NOTICE '';
    
    -- Step 1: Clear weekly order history (09:30)
    RAISE NOTICE 'STEP 1: CLEARING WEEKLY ORDER HISTORY (09:30)';
    RAISE NOTICE '----------------------------------------------';
    
    SELECT clear_weekly_order_history() INTO cleanup_result;
    
    RAISE NOTICE 'Cleanup success: %', cleanup_result->>'success';
    RAISE NOTICE 'Cleanup message: %', cleanup_result->>'message';
    RAISE NOTICE 'Expired buy orders: %', cleanup_result->>'expired_buy_orders';
    RAISE NOTICE 'Expired sell orders: %', cleanup_result->>'expired_sell_orders';
    RAISE NOTICE 'Refunded amount: N$%', cleanup_result->>'refunded_amount';
    RAISE NOTICE 'Refunded shares: %', cleanup_result->>'refunded_shares';
    RAISE NOTICE 'Windhoek time: %', cleanup_result->>'windhoek_time';
    RAISE NOTICE '';
    
    -- Step 2: Calculate weekly share price (10:03)
    RAISE NOTICE 'STEP 2: CALCULATING WEEKLY SHARE PRICE (10:03)';
    RAISE NOTICE '---------------------------------------------';
    
    SELECT calculate_weekly_share_price_simplified() INTO price_result;
    
    RAISE NOTICE 'Price calculation success: %', price_result->>'success';
    RAISE NOTICE 'Price calculation message: %', price_result->>'message';
    
    IF (price_result->>'success')::BOOLEAN THEN
        RAISE NOTICE 'NEW PRICE CALCULATED: N$%', price_result->>'final_price';
        RAISE NOTICE 'Base price: N$%', price_result->>'base_price';
        RAISE NOTICE 'Price change: N$%', price_result->>'price_change';
        RAISE NOTICE 'JSE200 growth rate: %%', price_result->>'j200_growth';
        RAISE NOTICE 'Effective date: %', price_result->>'effective_date';
    END IF;
    RAISE NOTICE 'Windhoek time: %', price_result->>'windhoek_time';
    RAISE NOTICE '';
    
    -- Step 3: Open exchange (10:05)
    RAISE NOTICE 'STEP 3: OPENING EXCHANGE (10:05)';
    RAISE NOTICE '--------------------------------';
    
    SELECT open_exchange_weekly() INTO open_result;
    
    RAISE NOTICE 'Exchange open success: %', open_result->>'success';
    RAISE NOTICE 'Exchange open message: %', open_result->>'message';
    RAISE NOTICE 'Windhoek time: %', open_result->>'windhoek_time';
    RAISE NOTICE '';
    
    -- Step 4: Verify current status
    RAISE NOTICE 'STEP 4: VERIFYING CURRENT STATUS';
    RAISE NOTICE '--------------------------------';
    
    SELECT get_current_share_price() INTO current_price;
    SELECT get_exchange_status() INTO exchange_status;
    
    RAISE NOTICE 'Current share price: N$%', current_price;
    RAISE NOTICE 'Exchange status: %', exchange_status->>'status_message';
    RAISE NOTICE 'Is trading open: %', exchange_status->>'is_trading_open';
    RAISE NOTICE 'Windhoek time: %', exchange_status->>'windhoek_time';
    RAISE NOTICE 'Timezone: %', exchange_status->>'timezone';
    RAISE NOTICE '';
    
    -- Final summary
    RAISE NOTICE 'PROCESS COMPLETE';
    RAISE NOTICE '===============';
    RAISE NOTICE 'All Monday morning processes have been executed';
    RAISE NOTICE 'Exchange should now be open for trading';
    RAISE NOTICE 'Price should be updated on dashboard';
    RAISE NOTICE 'All timezone issues resolved with UTC+2 offset';
    RAISE NOTICE '';
    RAISE NOTICE 'VERIFICATION COMMANDS:';
    RAISE NOTICE 'SELECT get_current_share_price();';
    RAISE NOTICE 'SELECT get_exchange_status();';
    RAISE NOTICE 'SELECT * FROM weekly_prices ORDER BY effective_date DESC LIMIT 3;';
    
END $$;
