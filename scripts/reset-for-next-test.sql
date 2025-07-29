-- Reset system for next test (optional - use carefully)
-- This script helps reset the system state for testing purposes

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    SYSTEM RESET FOR TESTING                                  █';
    RAISE NOTICE '█                    (Use with caution)                                       █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    -- Reset exchange to closed state
    UPDATE exchange_trading_hours 
    SET is_trading_open = FALSE,
        status_message = 'Exchange manually reset for testing',
        last_updated = NOW();
    
    RAISE NOTICE '✅ Exchange set to closed state';
    
    -- Reset all archived flags (make all orders visible in UI again)
    UPDATE buy_orders SET archived_for_ui = FALSE WHERE archived_for_ui = TRUE;
    UPDATE sell_orders SET archived_for_ui = FALSE WHERE archived_for_ui = TRUE;
    
    RAISE NOTICE '✅ All order archive flags reset (all orders visible in UI)';
    
    -- Optional: Cancel all pending orders (uncomment if needed)
    -- UPDATE buy_orders SET status = 'cancelled' WHERE status IN ('pending', 'partial');
    -- UPDATE sell_orders SET status = 'cancelled' WHERE status IN ('available', 'partial');
    -- RAISE NOTICE '✅ All pending orders cancelled';
    
    RAISE NOTICE '';
    RAISE NOTICE 'System reset completed. Ready for next test cycle.';
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
END $$;
