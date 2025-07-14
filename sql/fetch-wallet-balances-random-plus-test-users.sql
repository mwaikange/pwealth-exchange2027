-- ==============================================
-- FETCH WALLET BALANCES: 20 RANDOM + TEST USERS
-- ==============================================

-- First, let's get our test users specifically
WITH test_users AS (
    SELECT 
        u.id as user_uuid,
        u.email,
        'TEST_USER' as user_type,
        1 as priority_order
    FROM auth.users u 
    WHERE u.id IN (
        '8cd30e69-ddaa-4a90-94e3-f65472738164', -- charitywinstaan93@gmail.com
        '021337f1-f594-4f2f-812d-aa4daa88318e', -- mwaikange@gmail.com
        'd3997dd3-aa2e-429f-a53e-d44d17760eb0'  -- luwa@yopmail.com
    )
),
-- Get 20 random users (excluding test users)
random_users AS (
    SELECT 
        u.id as user_uuid,
        u.email,
        'RANDOM_USER' as user_type,
        2 as priority_order
    FROM auth.users u 
    WHERE u.id NOT IN (
        '8cd30e69-ddaa-4a90-94e3-f65472738164',
        '021337f1-f594-4f2f-812d-aa4daa88318e',
        'd3997dd3-aa2e-429f-a53e-d44d17760eb0'
    )
    AND u.email IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 20
),
-- Combine all users
all_target_users AS (
    SELECT * FROM test_users
    UNION ALL
    SELECT * FROM random_users
)

-- Main query: Get wallet balances for all target users
SELECT 'WALLET BALANCES: TEST USERS + 20 RANDOM USERS' as section;

SELECT 
    atu.user_type,
    atu.email,
    atu.user_uuid,
    COALESCE(us.wallet_type::text, 'NO_WALLET') as wallet_type,
    COALESCE(us.shares, 0) as balance,
    CASE 
        WHEN us.wallet_type IN ('buy_wallet', 'cashout_wallet') THEN CONCAT('N$', COALESCE(us.shares, 0)::text)
        WHEN us.wallet_type IN ('hold_wallet_pre_hold', 'hold_wallet_post_hold') THEN CONCAT(COALESCE(us.shares, 0)::text, ' shares')
        ELSE 'N/A'
    END as formatted_balance,
    us.source,
    us.created_at as wallet_created,
    us.updated_at as wallet_updated
FROM all_target_users atu
LEFT JOIN user_shares us ON atu.user_uuid = us.user_uuid
ORDER BY 
    atu.priority_order,  -- Test users first
    atu.email,
    CASE us.wallet_type::text
        WHEN 'buy_wallet' THEN 1
        WHEN 'hold_wallet_pre_hold' THEN 2
        WHEN 'hold_wallet_post_hold' THEN 3
        WHEN 'cashout_wallet' THEN 4
        ELSE 5
    END;

-- Summary by user type
SELECT 'SUMMARY BY USER TYPE' as section;

WITH all_target_users AS (
    SELECT 
        u.id as user_uuid,
        u.email,
        CASE 
            WHEN u.id IN (
                '8cd30e69-ddaa-4a90-94e3-f65472738164',
                '021337f1-f594-4f2f-812d-aa4daa88318e',
                'd3997dd3-aa2e-429f-a53e-d44d17760eb0'
            ) THEN 'TEST_USER'
            ELSE 'RANDOM_USER'
        END as user_type
    FROM auth.users u 
    WHERE u.id IN (
        SELECT user_uuid FROM (
            SELECT u2.id as user_uuid FROM auth.users u2 
            WHERE u2.id IN (
                '8cd30e69-ddaa-4a90-94e3-f65472738164',
                '021337f1-f594-4f2f-812d-aa4daa88318e',
                'd3997dd3-aa2e-429f-a53e-d44d17760eb0'
            )
            UNION ALL
            SELECT u3.id as user_uuid FROM auth.users u3 
            WHERE u3.id NOT IN (
                '8cd30e69-ddaa-4a90-94e3-f65472738164',
                '021337f1-f594-4f2f-812d-aa4daa88318e',
                'd3997dd3-aa2e-429f-a53e-d44d17760eb0'
            )
            AND u3.email IS NOT NULL
            ORDER BY RANDOM()
            LIMIT 20
        ) sub
    )
)

SELECT 
    atu.user_type,
    COUNT(DISTINCT atu.user_uuid) as total_users,
    COUNT(us.id) as total_wallet_records,
    ROUND(AVG(CASE WHEN us.wallet_type = 'buy_wallet' THEN us.shares END), 2) as avg_buy_wallet,
    ROUND(AVG(CASE WHEN us.wallet_type = 'hold_wallet_post_hold' THEN us.shares END), 2) as avg_hold_shares,
    ROUND(AVG(CASE WHEN us.wallet_type = 'cashout_wallet' THEN us.shares END), 2) as avg_cashout_wallet,
    SUM(CASE WHEN us.wallet_type = 'buy_wallet' THEN us.shares ELSE 0 END) as total_buy_wallet,
    SUM(CASE WHEN us.wallet_type = 'hold_wallet_post_hold' THEN us.shares ELSE 0 END) as total_hold_shares,
    SUM(CASE WHEN us.wallet_type = 'cashout_wallet' THEN us.shares ELSE 0 END) as total_cashout_wallet
FROM all_target_users atu
LEFT JOIN user_shares us ON atu.user_uuid = us.user_uuid
GROUP BY atu.user_type
ORDER BY atu.user_type;

-- Test users detailed breakdown
SELECT 'TEST USERS DETAILED BREAKDOWN' as section;

SELECT 
    u.email,
    u.id as user_uuid,
    COALESCE(
        SUM(CASE WHEN us.wallet_type = 'buy_wallet' THEN us.shares END), 0
    ) as buy_wallet_balance,
    COALESCE(
        SUM(CASE WHEN us.wallet_type = 'hold_wallet_post_hold' THEN us.shares END), 0
    ) as hold_shares,
    COALESCE(
        SUM(CASE WHEN us.wallet_type = 'cashout_wallet' THEN us.shares END), 0
    ) as cashout_balance,
    COUNT(us.id) as wallet_count,
    CASE 
        WHEN COUNT(us.id) >= 3 THEN '✓ Complete'
        ELSE CONCAT('✗ Missing (', COUNT(us.id), '/3)')
    END as wallet_status
FROM auth.users u
LEFT JOIN user_shares us ON u.id = us.user_uuid
WHERE u.id IN (
    '8cd30e69-ddaa-4a90-94e3-f65472738164', -- charitywinstaan93@gmail.com
    '021337f1-f594-4f2f-812d-aa4daa88318e', -- mwaikange@gmail.com
    'd3997dd3-aa2e-429f-a53e-d44d17760eb0'  -- luwa@yopmail.com
)
GROUP BY u.email, u.id
ORDER BY u.email;

-- Users with no wallet records
SELECT 'USERS WITH NO WALLET RECORDS' as section;

WITH all_target_users AS (
    SELECT u.id as user_uuid, u.email FROM auth.users u 
    WHERE u.id IN (
        SELECT user_uuid FROM (
            SELECT u2.id as user_uuid FROM auth.users u2 
            WHERE u2.id IN (
                '8cd30e69-ddaa-4a90-94e3-f65472738164',
                '021337f1-f594-4f2f-812d-aa4daa88318e',
                'd3997dd3-aa2e-429f-a53e-d44d17760eb0'
            )
            UNION ALL
            SELECT u3.id as user_uuid FROM auth.users u3 
            WHERE u3.id NOT IN (
                '8cd30e69-ddaa-4a90-94e3-f65472738164',
                '021337f1-f594-4f2f-812d-aa4daa88318e',
                'd3997dd3-aa2e-429f-a53e-d44d17760eb0'
            )
            AND u3.email IS NOT NULL
            ORDER BY RANDOM()
            LIMIT 20
        ) sub
    )
)

SELECT 
    atu.email,
    atu.user_uuid,
    'NO WALLET RECORDS' as issue
FROM all_target_users atu
LEFT JOIN user_shares us ON atu.user_uuid = us.user_uuid
WHERE us.id IS NULL
ORDER BY atu.email;

SELECT 'WALLET BALANCE FETCH COMPLETE' as status;
