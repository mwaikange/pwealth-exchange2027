-- Fix RLS policies to allow proper access to buy_orders and sell_orders

-- First, let's see what RLS policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('buy_orders', 'sell_orders')
ORDER BY tablename, policyname;

-- Check if RLS is enabled on these tables
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE tablename IN ('buy_orders', 'sell_orders');

-- OPTION 1: Temporarily disable RLS to test (ONLY for debugging)
-- Uncomment these lines to test if RLS is the issue:
-- ALTER TABLE buy_orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sell_orders DISABLE ROW LEVEL SECURITY;

-- OPTION 2: Fix RLS policies properly (RECOMMENDED)
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own buy orders" ON buy_orders;
DROP POLICY IF EXISTS "Users can insert their own buy orders" ON buy_orders;
DROP POLICY IF EXISTS "Users can update their own buy orders" ON buy_orders;
DROP POLICY IF EXISTS "Users can view their own sell orders" ON sell_orders;
DROP POLICY IF EXISTS "Users can insert their own sell orders" ON sell_orders;
DROP POLICY IF EXISTS "Users can update their own sell orders" ON sell_orders;

-- Create proper RLS policies for buy_orders
CREATE POLICY "Enable read access for authenticated users on buy_orders" ON buy_orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on buy_orders" ON buy_orders
    FOR INSERT WITH CHECK (auth.uid() = user_uuid);

CREATE POLICY "Enable update for users based on user_uuid on buy_orders" ON buy_orders
    FOR UPDATE USING (auth.uid() = user_uuid);

-- Create proper RLS policies for sell_orders  
CREATE POLICY "Enable read access for authenticated users on sell_orders" ON sell_orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on sell_orders" ON sell_orders
    FOR INSERT WITH CHECK (auth.uid() = user_uuid);

CREATE POLICY "Enable update for users based on user_uuid on sell_orders" ON sell_orders
    FOR UPDATE USING (auth.uid() = user_uuid);

-- Verify the new policies
SELECT 'New RLS policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('buy_orders', 'sell_orders')
ORDER BY tablename, policyname;
