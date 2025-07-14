-- ==============================================
-- DIAGNOSE WALLET TYPE AND USER ISSUES
-- ==============================================

-- Check if our test users exist
SELECT 'TEST USERS CHECK' as section;
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')
ORDER BY email;

-- Check current wallet_type enum values
SELECT 'CURRENT WALLET_TYPE ENUM VALUES' as section;
SELECT 
    enumlabel as wallet_type_value,
    enumsortorder as sort_order
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'wallet_type')
ORDER BY enumsortorder;

-- Check user_shares table structure
SELECT 'USER_SHARES TABLE STRUCTURE' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_shares' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing user_shares data
SELECT 'EXISTING USER_SHARES DATA' as section;
SELECT 
    us.id,
    u.email,
    us.wallet_type::text,
    us.shares,
    us.source,
    us.created_at
FROM user_shares us
JOIN auth.users u ON us.user_uuid = u.id
WHERE u.email IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')
ORDER BY u.email, us.wallet_type::text;

-- Check table constraints
SELECT 'USER_SHARES CONSTRAINTS' as section;
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_shares'::regclass
ORDER BY contype, conname;

SELECT 'DIAGNOSIS COMPLETE' as status;
