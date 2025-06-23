-- Debug why frontend queries aren't returning buy orders
-- Let's test the exact queries your frontend is using

-- 1. Test the exact query for GLOBAL market buy orders (what your frontend uses)
SELECT 'GLOBAL MARKET BUY ORDERS (frontend query):' as test_name;
SELECT *
FROM buy_orders
WHERE status IN ('pending', 'partial', 'filled')
ORDER BY created_at DESC;

-- 2. Test the exact query for USER-SPECIFIC buy orders  
SELECT 'USER BUY ORDERS for user 8cd30e69-ddaa-4a90-94e3-f65472738164:' as test_name;
SELECT *
FROM buy_orders
WHERE user_uuid = '8cd30e69-ddaa-4a90-94e3-f65472738164'
  AND status IN ('pending', 'partial', 'completed', 'filled')
ORDER BY created_at DESC;

-- 3. Check if RLS is blocking queries
SELECT 'RLS POLICIES ON BUY_ORDERS:' as test_name;
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'buy_orders';

-- 4. Test with RLS disabled (if you have superuser access)
SET row_security = off;
SELECT 'BUY ORDERS WITH RLS DISABLED:' as test_name;
SELECT * FROM buy_orders ORDER BY created_at DESC;
SET row_security = on;

-- 5. Check the current user context
SELECT 'CURRENT USER CONTEXT:' as test_name;
SELECT 
    current_user as db_user,
    session_user,
    current_setting('request.jwt.claims', true) as jwt_claims;
