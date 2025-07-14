-- ==============================================
-- STEP 1: CHECK CURRENT STATE
-- ==============================================

-- Check if wallet_type enum exists
SELECT 'CHECKING WALLET_TYPE ENUM' as section;
SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'wallet_type'
) as wallet_type_exists;

-- Check if user_shares table exists and its structure
SELECT 'CHECKING USER_SHARES TABLE' as section;
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_shares'
) as user_shares_exists;

-- If table exists, check its columns
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_shares'
ORDER BY ordinal_position;

-- Check current user_shares data for test users
SELECT 'CURRENT USER_SHARES DATA' as section;
SELECT 
    u.email,
    us.wallet_type,
    us.shares
FROM auth.users u
LEFT JOIN user_shares us ON u.id = us.user_uuid
WHERE u.email IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')
ORDER BY u.email, us.wallet_type;

-- Check if our test users exist
SELECT 'TEST USERS STATUS' as section;
SELECT 
    email,
    id,
    created_at
FROM auth.users 
WHERE email IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')
ORDER BY email;

-- Check exchange tables
SELECT 'EXCHANGE TABLES STATUS' as section;
SELECT 'buy_orders' as table_name, COUNT(*) as count FROM buy_orders
UNION ALL
SELECT 'sell_orders' as table_name, COUNT(*) as count FROM sell_orders;
