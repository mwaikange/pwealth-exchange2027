-- ==============================================
-- COMPLETE EXCHANGE RESET WITH TEST DATA
-- ==============================================

BEGIN;

-- Step 1: Clear all existing exchange data
TRUNCATE TABLE buy_orders CASCADE;
TRUNCATE TABLE sell_orders CASCADE;

-- Step 2: Reset user wallet balances for test users
-- Get user UUIDs first
WITH test_users AS (
    SELECT id, email FROM auth.users 
    WHERE email IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')
)
-- Clear existing balances for test users
DELETE FROM user_shares 
WHERE user_uuid IN (SELECT id FROM test_users);

-- Step 3: Set up fresh test balances
-- mwaikange@gmail.com - Heavy buyer profile
INSERT INTO user_shares (user_uuid, wallet_type, shares)
SELECT 
    u.id,
    'buy_wallet'::wallet_type,
    5000.00
FROM auth.users u 
WHERE u.email = 'mwaikange@gmail.com'
ON CONFLICT (user_uuid, wallet_type) 
DO UPDATE SET shares = 5000.00;

INSERT INTO user_shares (user_uuid, wallet_type, shares)
SELECT 
    u.id,
    'hold_wallet_post_hold'::wallet_type,
    25.0000
FROM auth.users u 
WHERE u.email = 'mwaikange@gmail.com'
ON CONFLICT (user_uuid, wallet_type) 
DO UPDATE SET shares = 25.0000;

INSERT INTO user_shares (user_uuid, wallet_type, shares)
SELECT 
    u.id,
    'cashout_wallet'::wallet_type,
    150.00
FROM auth.users u 
WHERE u.email = 'mwaikange@gmail.com'
ON CONFLICT (user_uuid, wallet_type) 
DO UPDATE SET shares = 150.00;

-- charitywinstaan93@gmail.com - Heavy seller profile
INSERT INTO user_shares (user_uuid, wallet_type, shares)
SELECT 
    u.id,
    'buy_wallet'::wallet_type,
    1200.00
FROM auth.users u 
WHERE u.email = 'charitywinstaan93@gmail.com'
ON CONFLICT (user_uuid, wallet_type) 
DO UPDATE SET shares = 1200.00;

INSERT INTO user_shares (user_uuid, wallet_type, shares)
SELECT 
    u.id,
    'hold_wallet_post_hold'::wallet_type,
    75.0000
FROM auth.users u 
WHERE u.email = 'charitywinstaan93@gmail.com'
ON CONFLICT (user_uuid, wallet_type) 
DO UPDATE SET shares = 75.0000;

INSERT INTO user_shares (user_uuid, wallet_type, shares)
SELECT 
    u.id,
    'cashout_wallet'::wallet_type,
    320.00
FROM auth.users u 
WHERE u.email = 'charitywinstaan93@gmail.com'
ON CONFLICT (user_uuid, wallet_type) 
DO UPDATE SET shares = 320.00;

-- luwa@yopmail.com - Balanced trader profile
INSERT INTO user_shares (user_uuid, wallet_type, shares)
SELECT 
    u.id,
    'buy_wallet'::wallet_type,
    2500.00
FROM auth.users u 
WHERE u.email = 'luwa@yopmail.com'
ON CONFLICT (user_uuid, wallet_type) 
DO UPDATE SET shares = 2500.00;

INSERT INTO user_shares (user_uuid, wallet_type, shares)
SELECT 
    u.id,
    'hold_wallet_post_hold'::wallet_type,
    45.0000
FROM auth.users u 
WHERE u.email = 'luwa@yopmail.com'
ON CONFLICT (user_uuid, wallet_type) 
DO UPDATE SET shares = 45.0000;

INSERT INTO user_shares (user_uuid, wallet_type, shares)
SELECT 
    u.id,
    'cashout_wallet'::wallet_type,
    80.00
FROM auth.users u 
WHERE u.email = 'luwa@yopmail.com'
ON CONFLICT (user_uuid, wallet_type) 
DO UPDATE SET shares = 80.00;

-- Step 4: Clear any old system logs related to exchange
DELETE FROM system_logs WHERE function_name LIKE '%exchange%' OR function_name LIKE '%order%';

-- Step 5: Insert a fresh system log entry
INSERT INTO system_logs (function_name, status, message, details)
VALUES (
    'complete_exchange_reset',
    'success',
    'Exchange completely reset with fresh test data',
    jsonb_build_object(
        'reset_time', NOW(),
        'orders_cleared', true,
        'test_users_setup', 3,
        'balances_reset', true
    )
);

COMMIT;

-- Step 6: Verify the reset
SELECT 'EXCHANGE RESET COMPLETED' as status;

SELECT 'TEST USER BALANCES' as section;
SELECT 
    u.email,
    us.wallet_type,
    us.shares
FROM auth.users u
JOIN user_shares us ON u.id = us.user_uuid
WHERE u.email IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')
ORDER BY u.email, us.wallet_type;

SELECT 'ORDER TABLES STATUS' as section;
SELECT 'buy_orders' as table_name, COUNT(*) as count FROM buy_orders
UNION ALL
SELECT 'sell_orders' as table_name, COUNT(*) as count FROM sell_orders;

SELECT 'READY FOR TESTING!' as status;
