-- Complete Monday morning process: Price calculation, order cleanup, and exchange opening
-- This simulates the full workflow that should happen every Monday at 10:05

BEGIN;

RAISE NOTICE '=== MONDAY MORNING PROCESS STARTING ===';
RAISE NOTICE 'Time: %', NOW();

-- Step 1: Calculate weekly price (if not already done)
DO $$
DECLARE
    calc_result RECORD;
BEGIN
    RAISE NOTICE '--- Step 1: Weekly Price Calculation ---';
    
    SELECT * INTO calc_result FROM calculate_weekly_share_price() LIMIT 1;
    
    RAISE NOTICE 'Price Calculation Result: %', calc_result.success;
    RAISE NOTICE 'Message: %', calc_result.message;
    
    IF calc_result.success THEN
        RAISE NOTICE 'Old Price: N$%', calc_result.old_price;
        RAISE NOTICE 'New Price: N$%', calc_result.new_price;
        RAISE NOTICE 'Price Change: N$%', calc_result.price_change;
        RAISE NOTICE 'JSE200 Growth: %%%', calc_result.j200_growth;
    END IF;
END;
$$;

-- Step 2: Expire and refund open orders from previous week
DO $$
DECLARE
    expired_buy_orders INTEGER := 0;
    expired_sell_orders INTEGER := 0;
    total_refunded_nad DECIMAL(10,2) := 0;
    total_refunded_shares DECIMAL(10,4) := 0;
    order_record RECORD;
BEGIN
    RAISE NOTICE '--- Step 2: Order Cleanup and Refunds ---';
    
    -- Process expired buy orders
    FOR order_record IN 
        SELECT user_uuid, total_cost, shares_to_buy 
        FROM buy_orders 
        WHERE status = 'open'
    LOOP
        -- Refund NAD to buy_wallet
        INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
        VALUES (
            order_record.user_uuid,
            'buy_wallet',
            order_record.total_cost,
            'expired_buy_order_refund',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_uuid, wallet_type) 
        DO UPDATE SET 
            shares = user_shares.shares + EXCLUDED.shares,
            updated_at = NOW();
            
        expired_buy_orders := expired_buy_orders + 1;
        total_refunded_nad := total_refunded_nad + order_record.total_cost;
    END LOOP;
    
    -- Process expired sell orders  
    FOR order_record IN 
        SELECT user_uuid, shares_to_sell 
        FROM sell_orders 
        WHERE status = 'open'
    LOOP
        -- Refund shares to hold_wallet_post_hold
        INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
        VALUES (
            order_record.user_uuid,
            'hold_wallet_post_hold',
            order_record.shares_to_sell,
            'expired_sell_order_refund',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_uuid, wallet_type) 
        DO UPDATE SET 
            shares = user_shares.shares + EXCLUDED.shares,
            updated_at = NOW();
            
        expired_sell_orders := expired_sell_orders + 1;
        total_refunded_shares := total_refunded_shares + order_record.shares_to_sell;
    END LOOP;
    
    -- Mark all open orders as expired
    UPDATE buy_orders SET 
        status = 'expired',
        updated_at = NOW()
    WHERE status = 'open';
    
    UPDATE sell_orders SET 
        status = 'expired', 
        updated_at = NOW()
    WHERE status = 'open';
    
    RAISE NOTICE 'Expired Buy Orders: %', expired_buy_orders;
    RAISE NOTICE 'Expired Sell Orders: %', expired_sell_orders;
    RAISE NOTICE 'Total NAD Refunded: N$%', total_refunded_nad;
    RAISE NOTICE 'Total Shares Refunded: %', total_refunded_shares;
END;
$$;

-- Step 3: Update exchange status to OPEN
DO $$
DECLARE
    current_time TIMESTAMPTZ;
    current_day INTEGER;
    current_hour INTEGER;
    current_minute INTEGER;
BEGIN
    RAISE NOTICE '--- Step 3: Exchange Status Update ---';
    
    current_time := NOW() AT TIME ZONE 'Africa/Johannesburg';
    current_day := EXTRACT(ISODOW FROM current_time);
    current_hour := EXTRACT(HOUR FROM current_time);
    current_minute := EXTRACT(MINUTE FROM current_time);
    
    RAISE NOTICE 'Current SAST Time: %', current_time;
    RAISE NOTICE 'Day of Week: % (1=Monday)', current_day;
    RAISE NOTICE 'Time: %:%', current_hour, current_minute;
    
    -- Force exchange to be considered "open" for testing
    IF current_day = 1 THEN
        RAISE NOTICE 'Exchange Status: OPEN (Monday detected)';
        RAISE NOTICE 'Trading is now active until 23:59 SAST';
    ELSE
        RAISE NOTICE 'Exchange Status: CLOSED (Not Monday)';
        RAISE NOTICE 'Next opening: Monday 10:05 SAST';
    END IF;
END;
$$;

-- Step 4: Verify current price and system status
DO $$
DECLARE
    current_price DECIMAL(10,2);
    price_history RECORD;
    exchange_status RECORD;
BEGIN
    RAISE NOTICE '--- Step 4: System Verification ---';
    
    -- Get current price
    SELECT get_current_share_price() INTO current_price;
    RAISE NOTICE 'Current Share Price: N$%', current_price;
    
    -- Get latest price history
    SELECT * INTO price_history FROM get_price_history(1) LIMIT 1;
    IF FOUND THEN
        RAISE NOTICE 'Latest Price Record:';
        RAISE NOTICE '  Date: %', price_history.effective_date;
        RAISE NOTICE '  Base Price: N$%', price_history.base_price;
        RAISE NOTICE '  Final Price: N$%', price_history.final_price;
        RAISE NOTICE '  Price Change: N$%', price_history.price_change;
        RAISE NOTICE '  JSE200 Growth: %%%', price_history.j200_growth;
    END IF;
    
    -- Get exchange status
    SELECT * INTO exchange_status FROM get_exchange_status() LIMIT 1;
    RAISE NOTICE 'Exchange Status: %', CASE WHEN exchange_status.is_open THEN 'OPEN' ELSE 'CLOSED' END;
    RAISE NOTICE 'Status Message: %', exchange_status.message;
END;
$$;

RAISE NOTICE '=== MONDAY MORNING PROCESS COMPLETE ===';

COMMIT;

-- Display final summary
SELECT 
    'SYSTEM STATUS' as category,
    'Current Share Price' as metric,
    'N$' || get_current_share_price() as value
UNION ALL
SELECT 
    'SYSTEM STATUS' as category,
    'Exchange Status' as metric,
    CASE WHEN (SELECT is_open FROM get_exchange_status() LIMIT 1) 
         THEN 'OPEN' 
         ELSE 'CLOSED' 
    END as value
UNION ALL
SELECT 
    'PRICE DATA' as category,
    'Latest Price Date' as metric,
    (SELECT effective_date::TEXT FROM weekly_prices ORDER BY effective_date DESC LIMIT 1) as value
UNION ALL
SELECT 
    'PRICE DATA' as category,
    'JSE200 Growth' as metric,
    (SELECT j200_growth::TEXT || '%' FROM weekly_prices ORDER BY effective_date DESC LIMIT 1) as value;
