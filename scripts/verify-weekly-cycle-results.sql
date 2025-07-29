-- Create a function to verify the weekly cycle results for better Supabase compatibility
CREATE OR REPLACE FUNCTION verify_weekly_cycle_results()
RETURNS JSON AS $$
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
    jse_data_count INTEGER;
    verification_results JSON;
    latest_jse_record RECORD;
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
    IF latest_price_history IS NOT NULL THEN
        RAISE NOTICE 'Effective date: %', latest_price_history.effective_date;
        RAISE NOTICE 'Base price: N$%', latest_price_history.base_price;
        RAISE NOTICE 'Final price: N$%', latest_price_history.final_price;
        RAISE NOTICE 'Price change: N$%', latest_price_history.price_change;
        RAISE NOTICE 'JSE200 growth: %%', latest_price_history.j200_growth;
        RAISE NOTICE 'Created at: %', latest_price_history.created_at;
    ELSE
        RAISE NOTICE '❌ No price records found';
    END IF;
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
    SELECT COUNT(*) INTO jse_data_count FROM jse200_priceupdate_mondays;
    
    RAISE NOTICE '4. JSE200 DATA INTEGRITY:';
    RAISE NOTICE '=========================';
    RAISE NOTICE 'Total JSE200 records: %', jse_data_count;
    
    -- Show latest JSE200 entries
    FOR latest_jse_record IN 
        SELECT week_start_date, price, percent_change, created_at
        FROM jse200_priceupdate_mondays 
        ORDER BY created_at DESC 
        LIMIT 3
    LOOP
        RAISE NOTICE 'Week: %, Price: %, Change: %%, Created: %', 
                     latest_jse_record.week_start_date,
                     latest_jse_record.price,
                     latest_jse_record.percent_change,
                     latest_jse_record.created_at;
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
    
    -- Build comprehensive verification results
    verification_results := json_build_object(
        'verification_timestamp', NOW(),
        'exchange_status', json_build_object(
            'is_trading_open', (exchange_status->>'is_trading_open')::BOOLEAN,
            'current_price', current_price,
            'status_message', exchange_status->>'status_message',
            'windhoek_time', exchange_status->>'windhoek_time'
        ),
        'price_calculation', CASE 
            WHEN latest_price_history IS NOT NULL THEN
                json_build_object(
                    'effective_date', latest_price_history.effective_date,
                    'base_price', latest_price_history.base_price,
                    'final_price', latest_price_history.final_price,
                    'price_change', latest_price_history.price_change,
                    'jse200_growth', latest_price_history.j200_growth,
                    'created_at', latest_price_history.created_at
                )
            ELSE NULL
        END,
        'order_counts', json_build_object(
            'buy_orders', json_build_object(
                'active', active_buy_orders,
                'archived', archived_buy_orders,
                'total', total_buy_orders
            ),
            'sell_orders', json_build_object(
                'active', active_sell_orders,
                'archived', archived_sell_orders,
                'total', total_sell_orders
            )
        ),
        'jse200_data', json_build_object(
            'total_records', jse_data_count
        ),
        'data_integrity_checks', json_build_object(
            'exchange_operational', (exchange_status->>'is_trading_open')::BOOLEAN AND current_price > 0,
            'price_calculation_complete', latest_price_history IS NOT NULL,
            'buy_order_integrity', total_buy_orders = (active_buy_orders + archived_buy_orders),
            'sell_order_integrity', total_sell_orders = (active_sell_orders + archived_sell_orders)
        ),
        'overall_success', (exchange_status->>'is_trading_open')::BOOLEAN AND 
                          current_price > 0 AND 
                          latest_price_history IS NOT NULL AND
                          total_buy_orders = (active_buy_orders + archived_buy_orders) AND
                          total_sell_orders = (active_sell_orders + archived_sell_orders)
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    VERIFICATION COMPLETED                                   █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    RETURN verification_results;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ VERIFICATION ERROR: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'sql_state', SQLSTATE,
            'failed_at', NOW()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the verification
DO $$
DECLARE
    verification_result JSON;
BEGIN
    RAISE NOTICE 'Starting Weekly Cycle Verification...';
    RAISE NOTICE '';
    
    SELECT verify_weekly_cycle_results() INTO verification_result;
    
    RAISE NOTICE '';
    RAISE NOTICE 'VERIFICATION RESULT SUMMARY:';
    RAISE NOTICE '===========================';
    RAISE NOTICE 'Overall Success: %', verification_result->>'overall_success';
    RAISE NOTICE 'Exchange Open: %', (verification_result->'exchange_status'->>'is_trading_open')::BOOLEAN;
    RAISE NOTICE 'Current Price: N$%', verification_result->'exchange_status'->>'current_price';
    RAISE NOTICE 'Price Calculation Complete: %', verification_result->'data_integrity_checks'->>'price_calculation_complete';
    RAISE NOTICE 'Data Integrity: Buy Orders %, Sell Orders %', 
                 verification_result->'data_integrity_checks'->>'buy_order_integrity',
                 verification_result->'data_integrity_checks'->>'sell_order_integrity';
    RAISE NOTICE '';
    
END $$;
