-- Test the exchange in OPEN state after Monday morning process
-- This verifies everything works correctly when the exchange is operational

RAISE NOTICE 'Testing exchange in OPEN state...';

-- 1. Check exchange status
RAISE NOTICE 'Step 1: Checking exchange status...';

SELECT 
    'Exchange Status Check' as test_name,
    is_open,
    message,
    next_open_time AT TIME ZONE 'Africa/Johannesburg' as next_open_sast,
    next_close_time AT TIME ZONE 'Africa/Johannesburg' as next_close_sast
FROM get_exchange_status();

-- 2. Verify current share price
RAISE NOTICE 'Step 2: Verifying current share price...';

SELECT 
    'Current Share Price' as test_name,
    get_current_share_price() as current_price,
    'N$' || get_current_share_price()::TEXT as formatted_price;

-- 3. Check price history
RAISE NOTICE 'Step 3: Checking price history...';

SELECT 
    'Price History' as test_name,
    effective_date,
    base_price,
    j200_growth,
    final_price,
    price_change,
    created_at AT TIME ZONE 'Africa/Johannesburg' as created_sast
FROM weekly_prices
ORDER BY effective_date DESC
LIMIT 5;

-- 4. Test order placement (should work when exchange is open)
RAISE NOTICE 'Step 4: Testing order placement functionality...';

-- Check if we can place orders (this should return success when exchange is open)
SELECT 
    'Order Placement Test' as test_name,
    CASE 
        WHEN (SELECT is_open FROM get_exchange_status() LIMIT 1) THEN 
            'Orders can be placed - Exchange is OPEN'
        ELSE 
            'Orders cannot be placed - Exchange is CLOSED'
    END as status;

-- 5. Verify wallet calculations use correct price
RAISE NOTICE 'Step 5: Testing wallet value calculations...';

-- This simulates what the frontend should show
WITH current_price AS (
    SELECT get_current_share_price() as price
),
sample_wallet AS (
    SELECT 
        100.0 as buy_wallet_balance,
        50.5555 as hold_wallet_pre_hold,
        25.2222 as hold_wallet_post_hold,
        75.0 as cashout_wallet_balance
)
SELECT 
    'Wallet Calculations' as test_name,
    sw.buy_wallet_balance,
    sw.hold_wallet_pre_hold,
    sw.hold_wallet_post_hold,
    sw.cashout_wallet_balance,
    cp.price as current_share_price,
    (sw.hold_wallet_pre_hold + sw.hold_wallet_post_hold) as total_shares,
    ROUND((sw.hold_wallet_pre_hold + sw.hold_wallet_post_hold) * cp.price, 2) as portfolio_value,
    ROUND(sw.buy_wallet_balance + sw.cashout_wallet_balance + 
          (sw.hold_wallet_pre_hold + sw.hold_wallet_post_hold) * cp.price, 2) as total_account_value
FROM current_price cp, sample_wallet sw;

-- 6. Check that expired orders were properly handled
RAISE NOTICE 'Step 6: Verifying expired orders were processed...';

SELECT 
    'Expired Orders Check' as test_name,
    COUNT(*) as expired_buy_orders
FROM buy_orders 
WHERE status = 'expired'

UNION ALL

SELECT 
    'Expired Orders Check' as test_name,
    COUNT(*) as expired_sell_orders
FROM sell_orders 
WHERE status = 'expired';

-- 7. Final system health check
RAISE NOTICE 'Step 7: Final system health check...';

SELECT 
    'System Health' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM weekly_prices WHERE effective_date = date_trunc('week', CURRENT_DATE)::DATE) 
        THEN 'PASS - Current week price exists'
        ELSE 'FAIL - No current week price found'
    END as price_system_status,
    
    CASE 
        WHEN (SELECT is_open FROM get_exchange_status() LIMIT 1) 
        THEN 'PASS - Exchange is open'
        ELSE 'FAIL - Exchange is closed'
    END as exchange_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM exchange_trading_hours WHERE is_open = TRUE)
        THEN 'PASS - Trading hours configured'
        ELSE 'FAIL - No trading hours found'
    END as trading_hours_status;

RAISE NOTICE '=== EXCHANGE OPEN STATE TEST COMPLETE ===';
RAISE NOTICE 'All systems should be operational and ready for trading!';
