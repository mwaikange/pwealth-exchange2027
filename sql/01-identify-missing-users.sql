-- ==============================================
-- STEP 1: IDENTIFY ALL MISSING USERS
-- ==============================================

-- Check total users in auth.users
SELECT 'TOTAL USERS IN SYSTEM' as section;
SELECT COUNT(*) as total_users FROM auth.users WHERE email IS NOT NULL;

-- Check users currently in user_shares
SELECT 'USERS WITH WALLET DATA' as section;
SELECT COUNT(DISTINCT user_uuid) as users_with_wallets FROM user_shares;

-- Identify the 3 remaining users
SELECT 'REMAINING USERS WITH WALLETS' as section;
SELECT 
    u.email,
    u.id as user_uuid,
    COUNT(us.id) as wallet_count
FROM auth.users u
JOIN user_shares us ON u.id = us.user_uuid
GROUP BY u.email, u.id
ORDER BY u.email;

-- Identify all missing users (should be 109)
SELECT 'MISSING USERS (NO WALLET DATA)' as section;
SELECT 
    u.email,
    u.id as user_uuid,
    u.created_at as user_created,
    'MISSING_WALLET_DATA' as status
FROM auth.users u
LEFT JOIN user_shares us ON u.id = us.user_uuid
WHERE us.id IS NULL
AND u.email IS NOT NULL
ORDER BY u.created_at;

-- Summary count
SELECT 'SUMMARY' as section;
SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE email IS NOT NULL) as total_users,
    (SELECT COUNT(DISTINCT user_uuid) FROM user_shares) as users_with_wallets,
    (SELECT COUNT(*) FROM auth.users WHERE email IS NOT NULL) - 
    (SELECT COUNT(DISTINCT user_uuid) FROM user_shares) as missing_users;
