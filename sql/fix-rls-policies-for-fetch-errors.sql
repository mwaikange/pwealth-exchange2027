-- Fix RLS policies that might be causing fetch errors

-- 1. Ensure user_shares has proper RLS policy
DROP POLICY IF EXISTS "Users can view own shares" ON user_shares;
CREATE POLICY "Users can view own shares" ON user_shares
  FOR SELECT USING (auth.uid() = user_uuid);

DROP POLICY IF EXISTS "Users can update own shares" ON user_shares;  
CREATE POLICY "Users can update own shares" ON user_shares
  FOR ALL USING (auth.uid() = user_uuid);

-- 2. Ensure vesting_schedules has proper RLS policy
DROP POLICY IF EXISTS "Users can view own vesting schedules" ON vesting_schedules;
CREATE POLICY "Users can view own vesting schedules" ON vesting_schedules
  FOR SELECT USING (auth.uid() = user_uuid);

DROP POLICY IF EXISTS "Users can update own vesting schedules" ON vesting_schedules;
CREATE POLICY "Users can update own vesting schedules" ON vesting_schedules
  FOR ALL USING (auth.uid() = user_uuid);

-- 3. Ensure share_transactions has proper RLS policy
DROP POLICY IF EXISTS "Users can view own transactions" ON share_transactions;
CREATE POLICY "Users can view own transactions" ON share_transactions
  FOR SELECT USING (auth.uid() = user_uuid);

DROP POLICY IF EXISTS "Users can insert own transactions" ON share_transactions;
CREATE POLICY "Users can insert own transactions" ON share_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_uuid);

-- 4. Make sure RLS is enabled on all tables
ALTER TABLE user_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE vesting_schedules ENABLE ROW LEVEL SECURITY;  
ALTER TABLE share_transactions ENABLE ROW LEVEL SECURITY;
