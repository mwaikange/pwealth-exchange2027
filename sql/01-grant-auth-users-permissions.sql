-- ==============================================
-- STEP 1: GRANT SELECT PERMISSION ON auth.users
-- Issue: "permission denied for table users" when placing buy/sell orders
-- Solution: Grant SELECT permission on auth.users to the 'authenticator' role.
-- This role is typically used by Supabase RPC functions.
-- ==============================================

BEGIN;

-- Grant SELECT permission on the auth.users table to the 'authenticator' role.
-- This allows functions running as 'authenticator' to query user information.
GRANT SELECT ON auth.users TO authenticator;

COMMIT;

SELECT 'AUTH.USERS SELECT PERMISSION GRANTED TO AUTHENTICATOR!' as status;
