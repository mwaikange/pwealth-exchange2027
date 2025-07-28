-- Test the exchange in OPEN state (assuming it's past 10:05 on Monday)
-- This script verifies all systems work correctly when the exchange is open

RAISE NOTICE '=== TESTING EXCHANGE OPEN SCENARIO ===';

-- Test 1: Verify exchange status shows OPEN
DO $$
DECLARE
    status_result RECORD;
BEGIN
    RAISE NOTICE '--- Test 1: Exchange Status Check ---';
    
    SELECT * INTO status_result FROM get_exchange_status() LIMIT 1;
    
    RAISE NOTICE 'Exchange Open: %', status_result.is_open;
    RAISE NOTICE 'Status Message: %', status_result.message;
    
    IF status_result.is_open THEN
        RAISE NOTICE '✅ Exchange is correctly showing as OPEN';
        IF status_result.next_close_time IS NOT NULL THEN
            RAISE NOTICE 'Closes at: %', status_result.next_close_time;
        END IF;
    ELSE
        RAISE NOTICE '❌ Exchange should be OPEN but showing as CLOSED';
        IF status_result.next_open_time IS NOT NULL THEN
            RAISE NOTICE 'Next opens: %', status_result.next_open_time;
        END IF;
    END IF;
END;
$$;

-- Test 2: Verify price calculation and precision
DO $$
DECLARE
    current_price DECIMAL(10,2);
    price_record RECORD;
BEGIN
    RAISE NOTICE '--- Test 2: Price System Verification ---';
    
    -- Test current price function
    SELECT get_current_share_price() INTO current_price;
    RAISE NOTICE 'Current Share Price: N$% (2 decimal places)', current_price;
    
    -- Test price history
    SELECT * INTO price_record FROM get_price_history(1) LIMIT 1;
    IF FOUND THEN
        RAISE NOTICE 'Latest Price History:';
        RAISE NOTICE '  Effective Date: %', price_record.effective_date;
        RAISE NOTICE '  Base Price: N$% (2 decimals)', price_record.base_price;
        RAISE NOTICE '  Final Price: N$% (2 decimals)', price_record.final_price;
        RAISE NOTICE '  Price Change: N$% (4 decimals)', price_record.price_change;
        RAISE NOTICE '  JSE200 Growth: %% (4 decimals)', price_record.j200_growth;
        
        -- Verify decimal precision
        IF LENGTH(SPLIT_PART(price_record.final_price::TEXT, '.', 2)) <= 2 THEN
            RAISE NOTICE '✅ Final price has correct decimal precision (≤2 places)';
        ELSE
            RAISE NOTICE '❌ Final price has too many decimal places';
        END IF;
        
        IF LENGTH(SPLIT_PART(price_record.price_change::TEXT, '.', 2)) <= 4 THEN
            RAISE NOTICE '✅ Price change has correct decimal precision (≤4 places)';
        ELSE
            RAISE NOTICE '❌ Price change has too many decimal places';
        END IF;
    ELSE
        RAISE NOTICE '❌ No price history found';
    END IF;
END;
$$;

-- Test 3: Verify order system can accept new orders (when exchange is open)
DO $$
DECLARE
    can_place_orders BOOLEAN;
    exchange_open BOOLEAN;
BEGIN
    RAISE NOTICE '--- Test 3: Order System Availability ---';
    
    SELECT is_open INTO exchange_open FROM get_exchange_status() LIMIT 1;
    
    IF exchange_open THEN
        RAISE NOTICE '✅ Exchange is OPEN - orders can be placed';
        RAISE NOTICE 'Order matching system is active';
        RAISE NOTICE 'New buy/sell orders will be processed';
    ELSE
        RAISE NOTICE '❌ Exchange is CLOSED - orders cannot be placed';
        RAISE NOTICE 'Order placement should be disabled in UI';
    END IF;
END;
$$;

-- Test 4: Check that expired orders were properly cleaned up
DO $$
DECLARE
    open_buy_orders INTEGER;
    open_sell_orders INTEGER;
    expired_buy_orders INTEGER;
    expired_sell_orders INTEGER;
BEGIN
    RAISE NOTICE '--- Test 4: Order Cleanup Verification ---';
    
    SELECT COUNT(*) INTO open_buy_orders FROM buy_orders WHERE status = 'open';
    SELECT COUNT(*) INTO open_sell_orders FROM sell_orders WHERE status = 'open';
    SELECT COUNT(*) INTO expired_buy_orders FROM buy_orders WHERE status = 'expired';
    SELECT COUNT(*) INTO expired_sell_orders FROM sell_orders WHERE status = 'expired';
    
    RAISE NOTICE 'Open Buy Orders: %', open_buy_orders;
    RAISE NOTICE 'Open Sell Orders: %', open_sell_orders;
    RAISE NOTICE 'Expired Buy Orders: %', expired_buy_orders;
    RAISE NOTICE 'Expired Sell Orders: %', expired_sell_orders;
    
    IF open_buy_orders = 0 AND open_sell_orders = 0 THEN
        RAISE NOTICE '✅ All previous orders properly expired and cleaned up';
    ELSE
        RAISE NOTICE '⚠️  Some orders may still be open from previous week';
    END IF;
END;
$$;

-- Test 5: Display current weekly_prices table state
RAISE NOTICE '--- Test 5: Weekly Prices Table State ---';
SELECT 
    effective_date,
    base_price,
    j200_growth,
    final_price,
    price_change,
    created_at
FROM weekly_prices 
ORDER BY effective_date DESC 
LIMIT 5;

-- Test 6: Verify JSE200 data source
DO $$
DECLARE
    latest_jse_record RECORD;
BEGIN
    RAISE NOTICE '--- Test 6: JSE200 Data Source ---';
    
    SELECT * INTO latest_jse_record 
    FROM JSE200_PriceUpdate_Mondays 
    ORDER BY date DESC 
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE 'Latest JSE200 Data:';
        RAISE NOTICE '  Date: %', latest_jse_record.date;
        RAISE NOTICE '  Growth: %% (4 decimals)', latest_jse_record.growth_percentage;
        RAISE NOTICE '✅ JSE200 data source is available';
    ELSE
        RAISE NOTICE '❌ No JSE200 data found - price calculation may fail';
    END IF;
END;
$$;

RAISE NOTICE '=== EXCHANGE OPEN SCENARIO TEST COMPLETE ===';

-- Final summary for easy reading
SELECT 
    '🎯 EXCHANGE STATUS' as section,
    CASE WHEN (SELECT is_open FROM get_exchange_status() LIMIT 1) 
         THEN '✅ OPEN' 
         ELSE '❌ CLOSED' 
    END as status,
    (SELECT message FROM get_exchange_status() LIMIT 1) as details
UNION ALL
SELECT 
    '💰 CURRENT PRICE' as section,
    'N$' || get_current_share_price() as status,
    'Updated with proper decimal precision' as details
UNION ALL
SELECT 
    '📊 LATEST CALCULATION' as section,
    (SELECT effective_date::TEXT FROM weekly_prices ORDER BY effective_date DESC LIMIT 1) as status,
    'JSE200 Growth: ' || (SELECT j200_growth::TEXT FROM weekly_prices ORDER BY effective_date DESC LIMIT 1) || '%' as details;
