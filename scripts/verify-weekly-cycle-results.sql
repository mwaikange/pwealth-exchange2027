-- Verify that the weekly cycle simulation worked correctly
DO $$
DECLARE
    exchange_status JSON;
    current_price NUMERIC;
    latest_weekly_price RECORD;
    latest_jse_data RECORD;
    active_orders_count INTEGER;
    order_history_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    WEEKLY CYCLE VERIFICATION                                 █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    -- Check exchange status
    SELECT get_exchange_status() INTO exchange_status;
    SELECT get_current_share_price() INTO current_price;
    
    RAISE NOTICE 'EXCHANGE STATUS VERIFICATION:';
    RAISE NOTICE '============================';
    RAISE NOTICE 'Is trading open: %', exchange_status->>'is_trading_open';
    RAISE NOTICE 'Status message: %', exchange_status->>'status_message';
    RAISE NOTICE 'Current price: N$%', current_price;
    RAISE NOTICE 'Windhoek time: %', exchange_status->>'windhoek_time';
    RAISE NOTICE '';
    
    -- Check latest weekly price calculation
    SELECT * INTO latest_weekly_price
    FROM weekly_prices 
    ORDER BY effective_date DESC 
    LIMIT 1;
    
    IF latest_weekly_price IS NOT NULL THEN
        RAISE NOTICE 'LATEST WEEKLY PRICE RECORD:';
        RAISE NOTICE '===========================';
        RAISE NOTICE 'Effective date: %', latest_weekly_price.effective_date;
        RAISE NOTICE 'Base price: N$%', latest_weekly_price.base_price;
        RAISE NOTICE 'JSE200 growth: %%', latest_weekly_price.j200_growth;
        RAISE NOTICE 'Final price: N$%', latest_weekly_price.final_price;
        RAISE NOTICE 'Price change: N$%', latest_weekly_price.price_change;
        RAISE NOTICE 'Created at: %', latest_weekly_price.created_at;
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '❌ NO WEEKLY PRICE RECORD FOUND!';
        RAISE NOTICE '';
    END IF;
    
    -- Check JSE200 data
    SELECT * INTO latest_jse_data
    FROM jse200_priceupdate_mondays 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF latest_jse_data IS NOT NULL THEN
        RAISE NOTICE 'LATEST JSE200 DATA:';
        RAISE NOTICE '==================';
        RAISE NOTICE 'Week start: %', latest_jse_data.week_start_date;
        RAISE NOTICE 'JSE200 price: %', latest_jse_data.price;
        RAISE NOTICE 'Percent change: %%', latest_jse_data.percent_change;
        RAISE NOTICE 'Day of week: %', latest_jse_data.day_of_week;
        RAISE NOTICE 'Updated at: %', latest_jse_data.updated_at;
        RAISE NOTICE '';
    END IF;
    
    -- Check active orders (should be minimal after cycle)
    SELECT COUNT(*) INTO active_orders_count
    FROM (
        SELECT id FROM buy_orders WHERE status = 'active'
        UNION ALL
        SELECT id FROM sell_orders WHERE status = 'active'
    ) active_orders;
    
    RAISE NOTICE 'ACTIVE ORDERS CHECK:';
    RAISE NOTICE '===================';
    RAISE NOTICE 'Active orders count: %', active_orders_count;
    
    -- Check order history (should have expired orders)
    SELECT COUNT(*) INTO order_history_count
    FROM (
        SELECT id FROM buy_orders WHERE status IN ('expired', 'cancelled')
        UNION ALL
        SELECT id FROM sell_orders WHERE status IN ('expired', 'cancelled')
    ) historical_orders;
    
    RAISE NOTICE 'Historical orders count: %', order_history_count;
    RAISE NOTICE '';
    
    -- Overall verification
    RAISE NOTICE 'OVERALL VERIFICATION:';
    RAISE NOTICE '====================';
    
    IF (exchange_status->>'is_trading_open')::BOOLEAN THEN
        RAISE NOTICE '✅ Exchange is open for trading';
    ELSE
        RAISE NOTICE '❌ Exchange is not open for trading';
    END IF;
    
    IF latest_weekly_price IS NOT NULL THEN
        RAISE NOTICE '✅ Weekly price calculation completed';
        RAISE NOTICE '   Price updated to N$% using %%% JSE200 change', 
                     latest_weekly_price.final_price, 
                     latest_weekly_price.j200_growth;
    ELSE
        RAISE NOTICE '❌ Weekly price calculation missing';
    END IF;
    
    IF current_price > 0 THEN
        RAISE NOTICE '✅ Current share price is valid: N$%', current_price;
    ELSE
        RAISE NOTICE '❌ Current share price is invalid: N$%', current_price;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'VERIFICATION COMPLETE';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
END $$;
