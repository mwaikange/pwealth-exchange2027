-- Clean up all conflicting RLS policies and create proper ones

-- First, let's see current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('buy_orders', 'sell_orders');

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for authenticated users on buy_orders" ON buy_orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users on buy_orders" ON buy_orders;
DROP POLICY IF EXISTS "Enable update for users based on user_uuid on buy_orders" ON buy_orders;
DROP POLICY IF EXISTS "Users can insert own buy orders" ON buy_orders;
DROP POLICY IF EXISTS "Users can manage their own buy orders" ON buy_orders;
DROP POLICY IF EXISTS "Users can view own buy orders" ON buy_orders;

DROP POLICY IF EXISTS "Enable read access for authenticated users on sell_orders" ON sell_orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users on sell_orders" ON sell_orders;
DROP POLICY IF EXISTS "Enable update for users based on user_uuid on sell_orders" ON sell_orders;
DROP POLICY IF EXISTS "Users can insert own sell orders" ON sell_orders;
DROP POLICY IF EXISTS "Users can manage their own sell orders" ON sell_orders;
DROP POLICY IF EXISTS "Users can view all sell orders" ON sell_orders;
DROP POLICY IF EXISTS "Users can view own sell orders" ON sell_orders;

-- Create simple, working policies for buy_orders
CREATE POLICY "buy_orders_select_all" ON buy_orders
    FOR SELECT USING (true);  -- Allow everyone to see all buy orders (for market display)

CREATE POLICY "buy_orders_insert_own" ON buy_orders
    FOR INSERT WITH CHECK (auth.uid() = user_uuid);

CREATE POLICY "buy_orders_update_own" ON buy_orders
    FOR UPDATE USING (auth.uid() = user_uuid);

-- Create simple, working policies for sell_orders
CREATE POLICY "sell_orders_select_all" ON sell_orders
    FOR SELECT USING (true);  -- Allow everyone to see all sell orders (for market display)

CREATE POLICY "sell_orders_insert_own" ON sell_orders
    FOR INSERT WITH CHECK (auth.uid() = user_uuid);

CREATE POLICY "sell_orders_update_own" ON sell_orders
    FOR UPDATE USING (auth.uid() = user_uuid);

-- Verify the clean policies
SELECT 'Cleaned RLS policies:' as info;
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('buy_orders', 'sell_orders')
ORDER BY tablename, policyname;
