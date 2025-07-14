-- ==============================================
-- CHECK TEST USER BALANCES IN USER_SHARES TABLE
-- ==============================================

-- Check if specific UUIDs exist and match expected emails
SELECT 'USER UUID TO EMAIL VERIFICATION' as section;
SELECT 
    u.id as user_uuid,
    u.email,
    CASE 
        WHEN u.id = '8cd30e69-ddaa-4a90-94e3-f65472738164' THEN 'charitywinstaan93@gmail.com ✓'
        WHEN u.id = '021337f1-f594-4f2f-812d-aa4daa88318e' THEN 'mwaikange@gmail.com ✓'
        WHEN u.id = 'd3997dd3-aa2e-429f-a53e-d44d17760eb0' THEN 'luwa@yopmail.com ✓'
        ELSE 'UNEXPECTED USER'
    END as expected_match,
    u.created_at
FROM auth.users u 
WHERE u.id IN (
    '8cd30e69-ddaa-4a90-94e3-f65472738164',
    '021337f1-f594-4f2f-812d-aa4daa88318e', 
    'd3997dd3-aa2e-429f-a53e-d44d17760eb0'
)
ORDER BY u.email;

-- Check user_shares balances for these specific UUIDs
SELECT 'USER_SHARES BALANCES BY UUID' as section;
SELECT 
    us.user_uuid,
    u.email,
    us.wallet_type::text,
    us.shares,
    CASE 
        WHEN us.wallet_type IN ('buy_wallet', 'cashout_wallet') THEN CONCAT('N$', us.shares::text)
        ELSE CONCAT(us.shares::text, ' shares')
    END as formatted_balance,
    us.source,
    us.created_at,
    us.updated_at
FROM user_shares us
JOIN auth.users u ON us.user_uuid = u.id
WHERE us.user_uuid IN (
    '8cd30e69-ddaa-4a90-94e3-f65472738164',
    '021337f1-f594-4f2f-812d-aa4daa88318e',
    'd3997dd3-aa2e-429f-a53e-d44d17760eb0'
)
ORDER BY u.email, 
    CASE us.wallet_type::text
        WHEN 'buy_wallet' THEN 1
        WHEN 'hold_wallet_pre_hold' THEN 2
        WHEN 'hold_wallet_post_hold' THEN 3
        WHEN 'cashout_wallet' THEN 4
        ELSE 5
    END;

-- Summary by user
SELECT 'BALANCE SUMMARY BY USER' as section;
SELECT 
    u.email,
    u.id as user_uuid,
    COUNT(us.id) as wallet_count,
    SUM(CASE WHEN us.wallet_type = 'buy_wallet' THEN us.shares ELSE 0 END) as buy_wallet_balance,
    SUM(CASE WHEN us.wallet_type = 'hold_wallet_post_hold' THEN us.shares ELSE 0 END) as post_hold_shares,
    SUM(CASE WHEN us.wallet_type = 'cashout_wallet' THEN us.shares ELSE 0 END) as cashout_balance
FROM auth.users u
LEFT JOIN user_shares us ON u.id = us.user_uuid
WHERE u.id IN (
    '8cd30e69-ddaa-4a90-94e3-f65472738164',
    '021337f1-f594-4f2f-812d-aa4daa88318e',
    'd3997dd3-aa2e-429f-a53e-d44d17760eb0'
)
GROUP BY u.email, u.id
ORDER BY u.email;

-- Check for any missing wallet types
SELECT 'MISSING WALLET TYPES CHECK' as section;
WITH expected_wallets AS (
    SELECT 
        u.id as user_uuid,
        u.email,
        wt.wallet_type
    FROM auth.users u
    CROSS JOIN (
        SELECT unnest(enum_range(NULL::wallet_type)) as wallet_type
    ) wt
    WHERE u.id IN (
        '8cd30e69-ddaa-4a90-94e3-f65472738164',
        '021337f1-f594-4f2f-812d-aa4daa88318e',
        'd3997dd3-aa2e-429f-a53e-d44d17760eb0'
    )
    AND wt.wallet_type IN ('buy_wallet', 'hold_wallet_post_hold', 'cashout_wallet')
)
SELECT 
    ew.email,
    ew.wallet_type::text as missing_wallet_type
FROM expected_wallets ew
LEFT JOIN user_shares us ON ew.user_uuid = us.user_uuid AND ew.wallet_type = us.wallet_type
WHERE us.id IS NULL
ORDER BY ew.email, ew.wallet_type::text;

-- Overall status
SELECT 'OVERALL STATUS CHECK' as section;
SELECT 
    CASE 
        WHEN COUNT(DISTINCT u.id) = 3 THEN 'All 3 users found ✓'
        ELSE CONCAT('Only ', COUNT(DISTINCT u.id), ' users found ✗')
    END as user_status,
    CASE 
        WHEN COUNT(us.id) >= 9 THEN 'Expected wallet records found ✓'
        ELSE CONCAT('Only ', COUNT(us.id), ' wallet records found ✗')
    END as wallet_status,
    COUNT(DISTINCT u.id) as unique_users,
    COUNT(us.id) as total_wallet_records
FROM auth.users u
LEFT JOIN user_shares us ON u.id = us.user_uuid
WHERE u.id IN (
    '8cd30e69-ddaa-4a90-94e3-f65472738164',
    '021337f1-f594-4f2f-812d-aa4daa88318e',
    'd3997dd3-aa2e-429f-a53e-d44d17760eb0'
);

SELECT 'BALANCE CHECK COMPLETE' as status;
