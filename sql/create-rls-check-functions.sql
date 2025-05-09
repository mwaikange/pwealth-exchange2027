-- Function to check if RLS is enabled for a table
CREATE OR REPLACE FUNCTION check_rls_enabled(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'table', table_name,
        'rls_enabled', rel.relrowsecurity
    )
    INTO result
    FROM pg_class rel
    WHERE rel.relname = table_name;
    
    RETURN result;
END;
$$;

-- Function to get policies for a table
CREATE OR REPLACE FUNCTION get_policies_for_table(table_name text)
RETURNS json[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    policies json[];
BEGIN
    SELECT array_agg(
        json_build_object(
            'policy_name', pol.polname,
            'table', table_name,
            'command', CASE
                WHEN pol.polcmd = 'r' THEN 'SELECT'
                WHEN pol.polcmd = 'a' THEN 'INSERT'
                WHEN pol.polcmd = 'w' THEN 'UPDATE'
                WHEN pol.polcmd = 'd' THEN 'DELETE'
                ELSE pol.polcmd::text
            END
        )
    )
    INTO policies
    FROM pg_policy pol
    JOIN pg_class rel ON rel.oid = pol.polrelid
    WHERE rel.relname = table_name;
    
    RETURN policies;
END;
$$;
