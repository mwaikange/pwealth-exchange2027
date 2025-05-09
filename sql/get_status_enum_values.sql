-- Create a function to get the allowed values for the status enum
CREATE OR REPLACE FUNCTION get_status_enum_values()
RETURNS TABLE (enum_value text) AS $$
BEGIN
    RETURN QUERY SELECT unnest(enum_range(NULL::pay_submission_status))::text;
EXCEPTION
    WHEN undefined_object THEN
        -- If the enum type doesn't exist, try to get the values from the check constraint
        RETURN QUERY 
        SELECT regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g')[1] AS enum_value
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE t.relname = 'pay_submissions' 
        AND a.attname = 'status' 
        AND c.contype = 'c';
END;
$$ LANGUAGE plpgsql;
