-- ==============================================
-- STEP 2: CONVERT AND INSERT MISSING USERS' BALANCES
-- ==============================================

-- Insert wallet records for all missing users based on conversion
-- Conversion: 1 token = 200 NAD, 1 share = 100 NAD, therefore 1 token = 2 shares
-- pwt_invest_balance → hold_wallet_pre_hold (shares)
-- pwt_cashout_balance → hold_wallet_post_hold (shares)

INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
SELECT 
    b.user_id,
    'buy_wallet'::wallet_type,
    0.0000,
    'balance_conversion_restore',
    NOW(),
    NOW()
FROM balances b
JOIN auth.users u ON b.user_id = u.id
LEFT JOIN user_shares us ON b.user_id = us.user_uuid
WHERE us.id IS NULL
AND u.email IS NOT NULL
AND u.email NOT IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')

UNION ALL

SELECT 
    b.user_id,
    'hold_wallet_pre_hold'::wallet_type,
    ROUND(b.pwt_invest_balance * 2, 4),
    'balance_conversion_restore',
    NOW(),
    NOW()
FROM balances b
JOIN auth.users u ON b.user_id = u.id
LEFT JOIN user_shares us ON b.user_id = us.user_uuid
WHERE us.id IS NULL
AND u.email IS NOT NULL
AND u.email NOT IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')

UNION ALL

SELECT 
    b.user_id,
    'hold_wallet_post_hold'::wallet_type,
    ROUND(b.pwt_cashout_balance * 2, 4),
    'balance_conversion_restore',
    NOW(),
    NOW()
FROM balances b
JOIN auth.users u ON b.user_id = u.id
LEFT JOIN user_shares us ON b.user_id = us.user_uuid
WHERE us.id IS NULL
AND u.email IS NOT NULL
AND u.email NOT IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')

UNION ALL

SELECT 
    b.user_id,
    'cashout_wallet'::wallet_type,
    0.0000,
    'balance_conversion_restore',
    NOW(),
    NOW()
FROM balances b
JOIN auth.users u ON b.user_id = u.id
LEFT JOIN user_shares us ON b.user_id = us.user_uuid
WHERE us.id IS NULL
AND u.email IS NOT NULL
AND u.email NOT IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com');

-- Check insertion results
SELECT 'CONVERSION INSERTION RESULTS' as section;
SELECT 
    COUNT(*) as total_records_inserted,
    COUNT(DISTINCT user_uuid) as users_restored,
    source
FROM user_shares 
WHERE source = 'balance_conversion_restore'
GROUP BY source;

-- Verify wallet distribution
SELECT 'WALLET TYPE DISTRIBUTION AFTER CONVERSION' as section;
SELECT 
    wallet_type::text,
    COUNT(*) as record_count,
    AVG(shares) as avg_shares,
    SUM(shares) as total_shares
FROM user_shares 
WHERE source = 'balance_conversion_restore'
GROUP BY wallet_type::text
ORDER BY wallet_type::text;

SELECT 'BALANCE CONVERSION COMPLETED!' as status;
