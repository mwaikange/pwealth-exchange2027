-- Verify the results of the weekly cycle simulation
-- Check that everything is in the correct state

DO $$
DECLARE
    exchange_status JSON;
    current_price NUMERIC;
    price_history RECORD;
    order_counts RECORD;
    user_balances RECORD;
BEGIN
    RAISE NOTICE 'VERIFYING WEEKLY CYCLE RESULTS';
    RAISE NOTICE '==============================';
    RAISE NOTICE '';
    
    -- 1. Check exchange status
    SELECT get_exchange_status() INTO exchange_status;
    
    RAISE NOTICE '1. EXCHANGE STATUS:';
    RAISE NOTICE '   Trading open: %', exchange_status->>'is_trading_open';
    RAISE NOTICE '   Status message: %', exchange_status->>'status_message';
    RAISE NOTICE '   Current week: %', exchange_status->>'current_week_start';
    RAISE NOTICE '   Last update: %', exchange_status->>'last_price_update';
    RAISE NOTICE '';
    
    -- 2. Check current share price
    SELECT get_current_share_price() INTO current_price;
    
    RAISE NOTICE '2. SHARE PRICE:';
    RAISE NOTICE '   Current price: N$%', current_price;
    RAISE NOTICE '';
    
    -- 3. Check latest price history
    SELECT * INTO price_history
    FROM weekly_prices 
    ORDER BY effective_date DESC 
    LIMIT 1;
    
    IF price_history IS NOT NULL THEN
        RAISE NOTICE '3. LATEST PRICE RECORD:';
        RAISE NOTICE '   Effective date: %', price_history.effective_date;
        RAISE NOTICE '   Base price: N$%', price_history.base_price;
        RAISE NOTICE '   JSE200 growth: %%', price_history.j200_growth;
        RAISE NOTICE '   Final price: N$%', price_history.final_price;
        RAISE NOTICE '   Price change: N$%', price_history.price_change;
        RAISE NOTICE '   Created: %', price_history.created_at;
    ELSE
        RAISE NOTICE '3. PRICE HISTORY: No records found';
    END IF;
    RAISE NOTICE '';
    
    -- 4. Check order counts by status
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_buy,
        COUNT(*) FILTER (WHERE status = 'partial') as partial_buy,
        COUNT(*) FILTER (WHERE status = 'filled') as filled_buy,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_buy,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_buy
    INTO order_counts
    FROM buy_orders;
    
    RAISE NOTICE '4. BUY ORDER STATUS COUNTS:';
    RAISE NOTICE '   Pending: %', order_counts.pending_buy;
    RAISE NOTICE '   Partial: %', order_counts.partial_buy;
    RAISE NOTICE '   Filled: %', order_counts.filled_buy;
    RAISE NOTICE '   Cancelled: %', order_counts.cancelled_buy;
    RAISE NOTICE '   Expired: %', order_counts.expired_buy;
    RAISE NOTICE '';
    
    SELECT 
        COUNT(*) FILTER (WHERE status = 'available') as available_sell,
        COUNT(*) FILTER (WHERE status = 'partial') as partial_sell,
        COUNT(*) FILTER (WHERE status = 'matched') as matched_sell,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_sell
    INTO order_counts
    FROM sell_orders;
    
    RAISE NOTICE '5. SELL ORDER STATUS COUNTS:';
    RAISE NOTICE '   Available: %', order_counts.available_sell;
    RAISE NOTICE '   Partial: %', order_counts.partial_sell;
    RAISE NOTICE '   Matched: %', order_counts.matched_sell;
    RAISE NOTICE '   Expired: %', order_counts.expired_sell;
    RAISE NOTICE '';
    
    -- 6. Check if exchange_status table has correct data
    DECLARE
        status_record RECORD;
    BEGIN
        SELECT * INTO status_record 
        FROM exchange_status 
        ORDER BY id DESC 
        LIMIT 1;
        
        RAISE NOTICE '6. EXCHANGE_STATUS TABLE:';
        RAISE NOTICE '   ID: %', status_record.id;
        RAISE NOTICE '   is_trading_open: %', status_record.is_trading_open;
        RAISE NOTICE '   current_week_start: %', status_record.current_week_start;
        RAISE NOTICE '   last_price_update: %', status_record.last_price_update;
        RAISE NOTICE '   status_message: %', status_record.status_message;
        RAISE NOTICE '   updated_at: %', status_record.updated_at;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '6. EXCHANGE_STATUS TABLE: Error - %', SQLERRM;
    END;
    RAISE NOTICE '';
    
    -- 7. Final assessment
    RAISE NOTICE '7. WEEKLY CYCLE ASSESSMENT:';
    RAISE NOTICE '===========================';
    
    IF (exchange_status->>'is_trading_open')::BOOLEAN THEN
        RAISE NOTICE '✅ Exchange is OPEN for trading';
    ELSE
        RAISE NOTICE '❌ Exchange is CLOSED - should be open';
    END IF;
    
    IF current_price > 100.00 THEN
        RAISE NOTICE '✅ Share price updated (N$% > N$100.00)', current_price;
    ELSE
        RAISE NOTICE '⚠️  Share price unchanged (N$%)', current_price;
    END IF;
    
    IF price_history IS NOT NULL AND price_history.effective_date = CURRENT_DATE THEN
        RAISE NOTICE '✅ New price record created for today';
    ELSE
        RAISE NOTICE '❌ No price record for current date';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'VERIFICATION COMPLETED';
    RAISE NOTICE '======================';
    
END $$;
