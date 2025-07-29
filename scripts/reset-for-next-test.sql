-- Reset function for next test - Supabase compatible
CREATE OR REPLACE FUNCTION reset_for_next_test()
RETURNS JSON AS $$
DECLARE
    reset_results JSON;
    buy_orders_reset INTEGER := 0;
    sell_orders_reset INTEGER := 0;
    price_records_kept INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    RESETTING FOR NEXT TEST                                  █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    -- Reset archived_for_ui flags to make orders visible again
    UPDATE buy_orders 
    SET archived_for_ui = FALSE,
        archived_at = NULL,
        updated_at = NOW()
    WHERE archived_for_ui = TRUE;
    
    GET DIAGNOSTICS buy_orders_reset = ROW_COUNT;
    
    UPDATE sell_orders 
    SET archived_for_ui = FALSE,
        archived_at = NULL,
        updated_at = NOW()
    WHERE archived_for_ui = TRUE;
    
    GET DIAGNOSTICS sell_orders_reset = ROW_COUNT;
    
    -- Count price records (we keep these for history)
    SELECT COUNT(*) INTO price_records_kept FROM weekly_prices;
    
    RAISE NOTICE 'RESET OPERATIONS COMPLETED:';
    RAISE NOTICE '===========================';
    RAISE NOTICE 'Buy orders un-archived: %', buy_orders_reset;
    RAISE NOTICE 'Sell orders un-archived: %', sell_orders_reset;
    RAISE NOTICE 'Price records preserved: %', price_records_kept;
    RAISE NOTICE '';
    RAISE NOTICE '✅ All order data restored to UI visibility';
    RAISE NOTICE '✅ Transaction history preserved';
    RAISE NOTICE '✅ Price calculation history maintained';
    RAISE NOTICE '';
    RAISE NOTICE 'System ready for next test cycle!';
    RAISE NOTICE '';
    
    reset_results := json_build_object(
        'success', true,
        'buy_orders_reset', buy_orders_reset,
        'sell_orders_reset', sell_orders_reset,
        'price_records_preserved', price_records_kept,
        'reset_at', NOW(),
        'message', 'System reset completed - ready for next test'
    );
    
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    RETURN reset_results;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ RESET ERROR: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'sql_state', SQLSTATE,
            'failed_at', NOW()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to run reset and return results
CREATE OR REPLACE FUNCTION run_system_reset()
RETURNS JSON AS $$
DECLARE
    reset_result JSON;
BEGIN
    RAISE NOTICE 'Starting system reset for next test...';
    
    SELECT reset_for_next_test() INTO reset_result;
    
    RAISE NOTICE 'Reset completed with success: %', reset_result->>'success';
    
    RETURN reset_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the reset and return results
SELECT run_system_reset();
