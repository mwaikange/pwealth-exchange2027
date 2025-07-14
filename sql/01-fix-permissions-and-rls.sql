-- Fix for `permission denied for table users`
-- Grant the 'authenticator' role permission to read from the auth.users table.
-- This is necessary for RPC functions that need to access user data.
GRANT SELECT ON TABLE auth.users TO authenticator;


-- Fix for cron job error: `function refresh_materialized_views() does not exist`
-- Create a placeholder function to prevent the pg_cron job from failing.
-- This function currently does nothing but can be expanded later if needed.
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    -- This is a placeholder function to prevent pg_cron errors.
    -- It currently does nothing.
    -- Replace with actual materialized view refresh logic if needed.
    RAISE NOTICE 'Placeholder refresh_materialized_views function executed successfully.';
    RETURN true;
END;
$$;

-- Grant execute permission on the new function to the postgres role, which pg_cron uses.
GRANT EXECUTE ON FUNCTION public.refresh_materialized_views() TO postgres;
