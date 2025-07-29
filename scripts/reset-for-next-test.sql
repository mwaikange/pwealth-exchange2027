-- Reset system for next weekly cycle test
-- This prepares the system for another simulation run

DO $$
BEGIN
    RAISE NOTICE 'RESETTING SYSTEM FOR NEXT TEST';
    RAISE NOTICE '==============================';
    
    -- Reset exchange to closed state
    UPDATE exchange_status 
    SET is_trading_open = false,
        status_message = 'Exchange reset for testing',
        updated_at = NOW()
    WHERE id = (SELECT MAX(id) FROM exchange_status);
    
    RAISE NOTICE '✅ Exchange status reset to closed';
    
    -- Clean up test orders (optional)
    -- DELETE FROM buy_orders WHERE status IN ('cancelled', 'expired');
    -- DELETE FROM sell_orders WHERE status IN ('expired');
    -- RAISE NOTICE '✅ Test orders cleaned up';
    
    -- Reset price to base value (optional)
    -- UPDATE weekly_prices SET final_price = 100.00 WHERE effective_date = CURRENT_DATE;
    -- RAISE NOTICE '✅ Price reset to base value';
    
    RAISE NOTICE '';
    RAISE NOTICE 'System ready for next weekly cycle simulation';
    RAISE NOTICE 'Run simulate-weekly-cycle-6-minutes.sql again to test';
    
END $$;
