-- Complete Monday morning process: Price calculation, order cleanup, and exchange opening
-- This simulates the full workflow that should happen every Monday at 10:05

BEGIN;

RAISE NOTICE 'Starting Monday morning exchange process...';

-- 1. First, expire all open orders and refund users
RAISE NOTICE 'Step 1: Expiring open orders and processing refunds...';

-- Expire buy orders and refund to buy_wallet
WITH expired_buy_orders AS (
    UPDATE buy_orders 
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'open'
    RETURNING user_uuid, (quantity * price_per_share) as refund_amount
)
INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
SELECT 
    user_uuid,
    'buy_wallet',
    refund_amount,
    'order_expiry_refund',
    NOW(),
    NOW()
FROM expired_buy_orders
ON CONFLICT (user_uuid, wallet_type)
DO UPDATE SET 
    shares = user_shares.shares + EXCLUDED.shares,
    updated_at = NOW();

-- Expire sell orders and refund shares to hold_wallet_pre_hold
WITH expired_sell_orders AS (
    UPDATE sell_orders 
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'open'
    RETURNING user_uuid, quantity as refund_shares
)
INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
SELECT 
    user_uuid,
    'hold_wallet_pre_hold',
    refund_shares,
    'order_expiry_refund',
    NOW(),
    NOW()
FROM expired_sell_orders
ON CONFLICT (user_uuid, wallet_type)
DO UPDATE SET 
    shares = user_shares.shares + EXCLUDED.shares,
    updated_at = NOW();

RAISE NOTICE 'Order expiry and refunds completed.';

-- 2. Calculate new weekly share price
RAISE NOTICE 'Step 2: Calculating new weekly share price...';

DO $$
DECLARE
    calc_result RECORD;
BEGIN
    SELECT * INTO calc_result 
    FROM calculate_weekly_share_price() 
    LIMIT 1;
    
    IF calc_result.success THEN
        RAISE NOTICE 'Price calculation successful: %', calc_result.message;
    ELSE
        RAISE WARNING 'Price calculation failed: %', calc_result.message;
    END IF;
END $$;

-- 3. Update exchange status to OPEN
RAISE NOTICE 'Step 3: Opening exchange for the week...';

-- Clear any existing exchange status and set to OPEN
DELETE FROM exchange_trading_hours WHERE id IS NOT NULL;

INSERT INTO exchange_trading_hours (
    is_open,
    last_updated,
    next_close_time,
    status_message
) VALUES (
    TRUE,
    NOW(),
    (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days 23 hours 59 minutes')::TIMESTAMPTZ,
    'Exchange is OPEN. Weekly price calculation completed. Trading is active.'
);

-- 4. Log the complete process
INSERT INTO price_calculation_log (
    calculation_date,
    status,
    message,
    created_at
) VALUES (
    CURRENT_DATE,
    'completed',
    'Monday morning process completed: Orders expired, prices calculated, exchange opened',
    NOW()
);

RAISE NOTICE 'Step 4: Process logged successfully.';

-- 5. Display final status
RAISE NOTICE 'Monday morning exchange process completed successfully!';

SELECT 
    'EXCHANGE STATUS' as info_type,
    is_open,
    status_message,
    last_updated AT TIME ZONE 'Africa/Johannesburg' as last_updated_sast
FROM exchange_trading_hours
WHERE id = (SELECT MAX(id) FROM exchange_trading_hours)

UNION ALL

SELECT 
    'CURRENT PRICE' as info_type,
    TRUE as is_open,
    format('N$%s (Change: N$%s, JSE200: %s%%)', 
           final_price, price_change, j200_growth) as status_message,
    created_at AT TIME ZONE 'Africa/Johannesburg' as last_updated_sast
FROM weekly_prices
ORDER BY effective_date DESC
LIMIT 1;

COMMIT;

RAISE NOTICE '=== MONDAY MORNING PROCESS COMPLETE ===';
