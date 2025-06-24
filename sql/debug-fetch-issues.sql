-- Debug script to check RLS policies and data access
-- Run this to diagnose the "Failed to fetch" errors

-- 1. Check if user_shares table exists and has data
SELECT 'user_shares table check' as test_name, count(*) as record_count 
FROM user_shares;

-- 2. Check if vesting_schedules table exists and has data  
SELECT 'vesting_schedules table check' as test_name, count(*) as record_count 
FROM vesting_schedules;

-- 3. Check if share_transactions table exists and has data
SELECT 'share_transactions table check' as test_name, count(*) as record_count 
FROM share_transactions;

-- 4. Check RLS policies on user_shares
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_shares';

-- 5. Check RLS policies on vesting_schedules
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'vesting_schedules';

-- 6. Check RLS policies on share_transactions
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'share_transactions';

-- 7. Test current user authentication
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as current_user_email,
  CASE WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED' ELSE 'AUTHENTICATED' END as auth_status;
