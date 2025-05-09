-- Enable RLS on pay_countries table and create policies
ALTER TABLE pay_countries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read countries
CREATE POLICY "Allow read access for all users on pay_countries"
ON pay_countries
FOR SELECT
USING (true);

-- Enable RLS on pay_banks table and create policies
ALTER TABLE pay_banks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read banks
CREATE POLICY "Allow read access for all users on pay_banks"
ON pay_banks
FOR SELECT
USING (true);

-- Enable RLS on pay_networks table and create policies
ALTER TABLE pay_networks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read networks
CREATE POLICY "Allow read access for all users on pay_networks"
ON pay_networks
FOR SELECT
USING (true);

-- Enable RLS on pay_configs table and create policies
ALTER TABLE pay_configs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read payment configs
CREATE POLICY "Allow read access for all users on pay_configs"
ON pay_configs
FOR SELECT
USING (true);

-- Enable RLS on pay_submissions table and create policies
ALTER TABLE pay_submissions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own submissions
CREATE POLICY "Allow users to read their own submissions"
ON pay_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own submissions
CREATE POLICY "Allow users to insert their own submissions"
ON pay_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own submissions
CREATE POLICY "Allow users to update their own submissions"
ON pay_submissions
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow authenticated users to delete their own submissions
CREATE POLICY "Allow users to delete their own submissions"
ON pay_submissions
FOR DELETE
USING (auth.uid() = user_id);

-- Allow service role to access all submissions (for admin purposes)
CREATE POLICY "Allow service role to access all submissions"
ON pay_submissions
USING (auth.jwt() ->> 'role' = 'service_role');
