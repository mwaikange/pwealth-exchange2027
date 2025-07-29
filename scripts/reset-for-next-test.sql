-- Reset system for another weekly cycle test
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '█                    RESETTING FOR NEXT TEST                                   █';
    RAISE NOTICE '█                                                                              █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
    -- Close exchange to prepare for next test
    RAISE NOTICE 'Closing exchange for reset...';
    UPDATE exchange_trading_hours 
    SET is_trading_open = false,
        last_updated = NOW()
    WHERE id = 1;
    
    -- Cancel any remaining active orders
    RAISE NOTICE 'Cancelling active orders...';
    UPDATE buy_orders 
    SET status = 'cancelled', updated_at = NOW() 
    WHERE status = 'active';
    
    UPDATE sell_orders 
    SET status = 'cancelled', updated_at = NOW() 
    WHERE status = 'active';
    
    -- Don't delete price history - keep it for reference
    RAISE NOTICE 'Keeping price history for reference...';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ System reset complete';
    RAISE NOTICE '   Exchange closed';
    RAISE NOTICE '   Active orders cancelled';
    RAISE NOTICE '   Ready for next simulation';
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    
END $$;
