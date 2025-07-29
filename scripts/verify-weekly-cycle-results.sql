-- Verify the results of the weekly cycle simulation
DO $$
DECLARE
    exchange_status JSON;
    current_price NUMERIC;
    latest_price_history RECORD;
    active_buy_orders INTEGER;
    active_sell_orders INTEGER;
    archived_buy_orders INTEGER;
    archived_sell_orders INTEGER;
    total_buy_orders INTEGER;
    total_sell_orders INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    WEEKLY CYCLE VERIFICATION REPORT                         █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    -- 1. Check exchange status
    SELECT get_exchange_status() INTO exchange_status;
    SELECT get_current_share_price() INTO current_price;
    
    RAISE NOTICE '1. EXCHANGE STATUS:';
    RAISE NOTICE '==================';
    RAISE NOTICE 'Trading open: %', exchange_status->>'is_trading_open';
    RAISE NOTICE 'Current price: N$%', current_price;
    RAISE NOTICE 'Status message: %', exchange_status->>'status_message';
    RAISE NOTICE 'Windhoek time: %', exchange_status->>'windhoek_time';
    RAISE NOTICE '';
    
    -- 2. Check latest price calculation
    SELECT * INTO latest_price_history
    FROM weekly_prices 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    RAISE NOTICE '2. LATEST PRICE CALCULATION:';
    RAISE NOTICE '============================';
    RAISE NOTICE 'Effective date: %', latest_price_history.effective_date;
    RAISE NOTICE 'Base price: N$%', latest_price_history.base_price;
    RAISE NOTICE 'Final price: N$%', latest_price_history.final_price;
    RAISE NOTICE 'Price change: N$%', latest_price_history.price_change;
    RAISE NOTICE 'JSE200 growth: %%', latest_price_history.j200_growth;
    RAISE NOTICE 'Created at: %', latest_price_history.created_at;
    RAISE NOTICE '';
    
    -- 3. Check order counts (active vs archived vs total)
    SELECT COUNT(*) INTO active_buy_orders
    FROM buy_orders 
    WHERE status IN ('pending', 'partial') 
    AND (archived_for_ui IS FALSE OR archived_for_ui IS NULL);
    
    SELECT COUNT(*) INTO archived_buy_orders
    FROM buy_orders 
    WHERE archived_for_ui = TRUE;
    
    SELECT COUNT(*) INTO total_buy_orders
    FROM buy_orders;
    
    SELECT COUNT(*) INTO active_sell_orders
    FROM sell_orders 
    WHERE status IN ('available', 'partial')
    AND (archived_for_ui IS FALSE OR archived_for_ui IS NULL);
    
    SELECT COUNT(*) INTO archived_sell_orders
    FROM sell_orders 
    WHERE archived_for_ui = TRUE;
    
    SELECT COUNT(*) INTO total_sell_orders
    FROM sell_orders;
    
    RAISE NOTICE '3. ORDER STATUS VERIFICATION:';
    RAISE NOTICE '=============================';
    RAISE NOTICE 'Buy Orders:';
    RAISE NOTICE '  - Active (UI visible): %', active_buy_orders;
    RAISE NOTICE '  - Archived (UI hidden): %', archived_buy_orders;
    RAISE NOTICE '  - Total in database: %', total_buy_orders;
    RAISE NOTICE '';
    RAISE NOTICE 'Sell Orders:';
    RAISE NOTICE '  - Active (UI visible): %', active_sell_orders;
    RAISE NOTICE '  - Archived (UI hidden): %', archived_sell_orders;
    RAISE NOTICE '  - Total in database: %', total_sell_orders;
    RAISE NOTICE '';
    
    -- 4. Verify JSE200 data integrity
    RAISE NOTICE '4. JSE200 DATA INTEGRITY:';
    RAISE NOTICE '=========================';
    
    -- Show latest JSE200 entries
    FOR latest_price_history IN 
        SELECT week_start_date, price, percent_change, created_at
        FROM jse200_priceupdate_mondays 
        ORDER BY created_at DESC 
        LIMIT 3
    LOOP
        RAISE NOTICE 'Week: %, Price: %, Change: %%, Created: %', 
                     latest_price_history.week_start_date,
                     latest_price_history.price,
                     latest_price_history.percent_change,
                     latest_price_history.created_at;
    END LOOP;
    RAISE NOTICE '';
    
    -- 5. Summary
    RAISE NOTICE '5. VERIFICATION SUMMARY:';
    RAISE NOTICE '========================';
    
    IF (exchange_status->>'is_trading_open')::BOOLEAN THEN
        RAISE NOTICE '✅ Exchange is open for trading';
    ELSE
        RAISE NOTICE '❌ Exchange is closed';
    END IF;
    
    IF current_price > 0 THEN
        RAISE NOTICE '✅ Current price is valid: N$%', current_price;
    ELSE
        RAISE NOTICE '❌ Current price is invalid: N$%', current_price;
    END IF;
    
    IF total_buy_orders = (active_buy_orders + archived_buy_orders) THEN
        RAISE NOTICE '✅ Buy order data integrity maintained';
    ELSE
        RAISE NOTICE '❌ Buy order data integrity issue';
    END IF;
    
    IF total_sell_orders = (active_sell_orders + archived_sell_orders) THEN
        RAISE NOTICE '✅ Sell order data integrity maintained';
    ELSE
        RAISE NOTICE '❌ Sell order data integrity issue';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    VERIFICATION COMPLETED                                   █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
END $$;
