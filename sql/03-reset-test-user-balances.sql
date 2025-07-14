-- ==============================================
-- STEP 3: RESET TEST USER BALANCES
-- ==============================================

BEGIN;

-- Clear existing balances for test users only
DELETE FROM user_shares 
WHERE user_uuid IN (
    SELECT id FROM auth.users 
    WHERE email IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')
);

-- Insert fresh balances for mwaikange@gmail.com (Heavy buyer)
INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
SELECT 
    u.id,
    'buy_wallet'::wallet_type,
    5000.00,
    'test_reset'
FROM auth.users u 
WHERE u.email = 'mwaikange@gmail.com';

INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
SELECT 
    u.id,
    'hold_wallet_post_hold'::wallet_type,
    25.0000,
    'test_reset'
FROM auth.users u 
WHERE u.email = 'mwaikange@gmail.com';

INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
SELECT 
    u.id,
    'cashout_wallet'::wallet_type,
    150.00,
    'test_reset'
FROM auth.users u 
WHERE u.email = 'mwaikange@gmail.com';

-- Insert fresh balances for charitywinstaan93@gmail.com (Heavy seller)
INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
SELECT 
    u.id,
    'buy_wallet'::wallet_type,
    1200.00,
    'test_reset'
FROM auth.users u 
WHERE u.email = 'charitywinstaan93@gmail.com';

INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
SELECT 
    u.id,
    'hold_wallet_post_hold'::wallet_type,
    75.0000,
    'test_reset'
FROM auth.users u 
WHERE u.email = 'charitywinstaan93@gmail.com';

INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
SELECT 
    u.id,
    'cashout_wallet'::wallet_type,
    320.00,
    'test_reset'
FROM auth.users u 
WHERE u.email = 'charitywinstaan93@gmail.com';

-- Insert fresh balances for luwa@yopmail.com (Balanced trader)
INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
SELECT 
    u.id,
    'buy_wallet'::wallet_type,
    2500.00,
    'test_reset'
FROM auth.users u 
WHERE u.email = 'luwa@yopmail.com';

INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
SELECT 
    u.id,
    'hold_wallet_post_hold'::wallet_type,
    45.0000,
    'test_reset'
FROM auth.users u 
WHERE u.email = 'luwa@yopmail.com';

INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
SELECT 
    u.id,
    'cashout_wallet'::wallet_type,
    80.00,
    'test_reset'
FROM auth.users u 
WHERE u.email = 'luwa@yopmail.com';

COMMIT;

-- Verify the balances
SELECT 'TEST USER BALANCES AFTER RESET' as section;
SELECT 
    u.email,
    us.wallet_type::text,
    us.shares,
    CASE 
        WHEN us.wallet_type IN ('buy_wallet', 'cashout_wallet') THEN CONCAT('N$', us.shares::text)
        ELSE CONCAT(us.shares::text, ' shares')
    END as formatted_balance
FROM auth.users u
JOIN user_shares us ON u.id = us.user_uuid
WHERE u.email IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')
ORDER BY u.email, 
    CASE us.wallet_type::text
        WHEN 'buy_wallet' THEN 1
        WHEN 'hold_wallet_post_hold' THEN 2  
        WHEN 'cashout_wallet' THEN 3
        ELSE 4
    END;

SELECT 'USER BALANCES RESET COMPLETED!' as status;
