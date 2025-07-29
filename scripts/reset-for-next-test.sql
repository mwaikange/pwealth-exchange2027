-- Reset system for next test run
DO $$
DECLARE
    reset_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    RESET SYSTEM FOR NEXT TEST                               █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    RAISE NOTICE '🔄 RESETTING SYSTEM STATE...';
    RAISE NOTICE '';
    
    -- Reset archived flags (un-archive orders for UI)
    UPDATE buy_orders 
    SET archived_for_ui = FALSE,
        archived_at = NULL,
        updated_at = NOW()
    WHERE archived_for_ui = TRUE;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RAISE NOTICE '✅ Un-archived % buy orders for UI display', reset_count;
    
    UPDATE sell_orders 
    SET archived_for_ui = FALSE,
        archived_at = NULL,
        updated_at = NOW()
    WHERE archived_for_ui = TRUE;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RAISE NOTICE '✅ Un-archived % sell orders for UI display', reset_count;
    
    -- Note: We don't delete any data - just reset UI flags
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESET ACTIONS COMPLETED:';
    RAISE NOTICE '   ✅ All orders visible in UI again';
    RAISE NOTICE '   ✅ No data deleted (transaction history preserved)';
    RAISE NOTICE '   ✅ Exchange can be tested again';
    RAISE NOTICE '';
    
    -- Show current state
    RAISE NOTICE '📈 CURRENT STATE AFTER RESET:';
    RAISE NOTICE '   Buy orders visible in UI: %', (SELECT COUNT(*) FROM buy_orders WHERE archived_for_ui IS NULL OR archived_for_ui = FALSE);
    RAISE NOTICE '   Sell orders visible in UI: %', (SELECT COUNT(*) FROM sell_orders WHERE archived_for_ui IS NULL OR archived_for_ui = FALSE);
    RAISE NOTICE '   Total orders in database: %', (SELECT COUNT(*) FROM buy_orders) + (SELECT COUNT(*) FROM sell_orders);
    RAISE NOTICE '';
    
    RAISE NOTICE '🚀 SYSTEM READY FOR NEXT TEST!';
    RAISE NOTICE '   You can run the simulation script again';
    RAISE NOTICE '';
    
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    RESET COMPLETED                                          █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
END $$;
