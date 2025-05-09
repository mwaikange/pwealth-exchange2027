-- First, let's clean up the conflicting policies
DROP POLICY IF EXISTS "Allow users to delete their own submissions" ON pay_submissions;
DROP POLICY IF EXISTS "Allow users to insert their own submissions" ON pay_submissions;
DROP POLICY IF EXISTS "Allow users to read their own submissions" ON pay_submissions;
DROP POLICY IF EXISTS "Allow users to update their own submissions" ON pay_submissions;
DROP POLICY IF EXISTS "Allow service role to access all submissions" ON pay_submissions;

-- Now, let's create clean policies that make sense
-- 1. Allow service role full access (this is the most important one for our admin client)
CREATE POLICY "service_role_full_access" 
ON pay_submissions
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (true);

-- 2. Allow authenticated users to access their own data
CREATE POLICY "authenticated_users_read_own" 
ON pay_submissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_insert_own" 
ON pay_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_update_own" 
ON pay_submissions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_delete_own" 
ON pay_submissions
FOR DELETE
USING (auth.uid() = user_id);
