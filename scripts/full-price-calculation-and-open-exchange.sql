-- Complete price calculation and exchange opening script
-- Simulates the full Monday morning process

DO $$
DECLARE
    cleanup_result JSON;
    price_result JSON;
    open_result JSON;
    current_price NUMERIC;
    exchange_status JSON;
BEGIN
    RAISE NOTICE 'FULL MONDAY MORNING PROCESS SIMULATION';
    RAISE NOTICE '====================================';
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
    RAISE NOTICE '';
    
    -- Step 2: Calculate weekly share price (10:03)
    RAISE NOTICE 'STEP 2: CALCULATING WEEKLY SHARE PRICE (10:03)';
    RAISE NOTICE '---------------------------------------------';
    
    SELECT * INTO price_result FROM calculate_weekly_share_price_simplified();
    
    RAISE NOTICE 'Price calculation success: %', price_result.success;
    RAISE NOTICE 'Price calculation message: %', price_result.message;
    
    IF price_result.new_price IS NOT NULL THEN
        RAISE NOTICE 'NEW PRICE CALCULATED: N$%', price_result.new_price;
        RAISE NOTICE 'Growth rate applied: %%', price_result.growth_rate;
    END IF;
    RAISE NOTICE '';
    
    -- Step 3: Open exchange (10:05)
    RAISE NOTICE 'STEP 3: OPENING EXCHANGE (10:05)';
    RAISE NOTICE '--------------------------------';
    
    SELECT open_exchange_weekly() INTO open_result;
    
    RAISE NOTICE 'Exchange open success: %', open_result->>'success';
    RAISE NOTICE 'Exchange open message: %', open_result->>'message';
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
    RAISE NOTICE '';
    
    -- Final summary
    RAISE NOTICE 'PROCESS COMPLETE';
    RAISE NOTICE '===============';
    RAISE NOTICE 'All Monday morning processes have been executed';
    RAISE NOTICE 'Exchange should now be open for trading';
    RAISE NOTICE 'Price should be updated on dashboard';
    RAISE NOTICE '';
    RAISE NOTICE 'VERIFICATION COMMANDS:';
    RAISE NOTICE 'SELECT get_current_share_price();';
    RAISE NOTICE 'SELECT get_exchange_status();';
    RAISE NOTICE 'SELECT * FROM weekly_prices ORDER BY effective_date DESC LIMIT 3;';
    
END $$;
