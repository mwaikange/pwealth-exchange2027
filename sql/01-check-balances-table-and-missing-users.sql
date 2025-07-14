-- ==============================================
-- STEP 1: CHECK BALANCES TABLE AND MISSING USERS
-- ==============================================

-- Check the balances table structure and data
SELECT 'BALANCES TABLE STRUCTURE' as section;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'balances'
ORDER BY ordinal_position;

-- Check sample balances data
SELECT 'SAMPLE BALANCES DATA' as section;
SELECT 
    user_id,
    pwt_invest_balance,
    pwt_cashout_balance,
    created_at
FROM balances 
ORDER BY created_at DESC
LIMIT 10;

-- Count total users in balances table
SELECT 'BALANCES TABLE SUMMARY' as section;
SELECT 
    COUNT(*) as total_balance_records,
    COUNT(DISTINCT user_id) as unique_users_with_balances,
    AVG(pwt_invest_balance) as avg_invest_balance,
    AVG(pwt_cashout_balance) as avg_cashout_balance,
    MAX(pwt_invest_balance) as max_invest_balance,
    MAX(pwt_cashout_balance) as max_cashout_balance
FROM balances;

-- Check which users from balances are missing from user_shares
SELECT 'USERS MISSING FROM USER_SHARES' as section;
SELECT 
    b.user_id,
    u.email,
    b.pwt_invest_balance,
    b.pwt_cashout_balance,
    -- Calculate conversion
    ROUND(b.pwt_invest_balance * 2, 4) as hold_pre_shares,
    ROUND(b.pwt_cashout_balance * 2, 4) as hold_post_shares
FROM balances b
JOIN auth.users u ON b.user_id = u.id
LEFT JOIN user_shares us ON b.user_id = us.user_uuid
WHERE us.id IS NULL
AND u.email IS NOT NULL
ORDER BY u.email
LIMIT 20;

-- Count missing users
SELECT 'MISSING USERS COUNT' as section;
SELECT COUNT(*) as missing_users_count
FROM balances b
JOIN auth.users u ON b.user_id = u.id
LEFT JOIN user_shares us ON b.user_id = us.user_uuid
WHERE us.id IS NULL
AND u.email IS NOT NULL;

-- Verify the 3 existing users are NOT in this missing list
SELECT 'VERIFY EXISTING USERS NOT IN MISSING LIST' as section;
SELECT 
    u.email,
    CASE 
        WHEN us.user_uuid IS NOT NULL THEN 'HAS_WALLET_DATA'
        ELSE 'MISSING_WALLET_DATA'
    END as wallet_status
FROM auth.users u
LEFT JOIN user_shares us ON u.id = us.user_uuid
WHERE u.email IN (
    'mwaikange@gmail.com',
    'charitywinstaan93@gmail.com', 
    'luwa@yopmail.com'
)
GROUP BY u.email, us.user_uuid;
