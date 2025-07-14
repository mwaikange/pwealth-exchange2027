-- =================================================================
-- FIX for `function generate_order_reference(unknown) does not exist`
-- This script creates the missing helper function required by the
-- order placement logic.
-- =================================================================

BEGIN;

-- STEP 1: Create the missing function
CREATE OR REPLACE FUNCTION public.generate_order_reference(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    v_timestamp TEXT;
    v_random_str TEXT;
BEGIN
    -- Get a detailed timestamp string (YYYYMMDDHH24MISSMS)
    v_timestamp := to_char(NOW(), 'YYYYMMDDHH24MISSMS');

    -- Generate a 6-character random alphanumeric string
    v_random_str := array_to_string(
        ARRAY(
            SELECT substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36)::int + 1, 1)
            FROM generate_series(1, 6)
        ), ''
    );

    -- Combine them into a unique reference string
    -- Example: BUY-20250627143000123-A4B7C9
    RETURN UPPER(p_prefix) || '-' || v_timestamp || '-' || v_random_str;
END;
$$ LANGUAGE plpgsql VOLATILE;


-- STEP 2: Grant permission to the authenticated role to use this function
GRANT EXECUTE ON FUNCTION public.generate_order_reference(TEXT) TO authenticated;

COMMIT;
