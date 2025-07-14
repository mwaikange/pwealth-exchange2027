-- Create a comprehensive status checker function that runs every 5 minutes
CREATE OR REPLACE FUNCTION periodic_order_status_check()
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := '';
    fixed_statuses INTEGER := 0;
    expired_orders INTEGER := 0;
    matched_orders INTEGER := 0;
BEGIN
    -- 1. Fix any incorrect statuses
    SELECT fix_order_statuses() INTO result_text;
    
    -- Extract the number from the result
    fixed_statuses := CAST(REGEXP_REPLACE(result_text, '[^0-9]', '', 'g') AS INTEGER);
    
    -- 2. Expire old sell orders (past Sunday 23:59)
    SELECT expire_old_sell_orders() INTO expired_orders;
    
    -- 3. Try to match any pending orders
    PERFORM match_orders();
    
    -- 4. Count recent matches (last 5 minutes)
    SELECT COUNT(*) INTO matched_orders
    FROM matched_orders 
    WHERE created_at > NOW() - INTERVAL '5 minutes';
    
    -- 5. Log the activity
    INSERT INTO system_logs (
        log_type, 
        message, 
        details,
        created_at
    ) VALUES (
        'order_status_check',
        'Periodic order status check completed',
        json_build_object(
            'fixed_statuses', fixed_statuses,
            'expired_orders', expired_orders,
            'recent_matches', matched_orders,
            'check_time', NOW()
        ),
        NOW()
    );
    
    RETURN format('Status check completed: %s statuses fixed, %s orders expired, %s recent matches', 
                  fixed_statuses, expired_orders, matched_orders);
END;
$$ LANGUAGE plpgsql;

-- Create system_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_type TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_system_logs_type_time ON system_logs(log_type, created_at);

-- Enable the pg_cron extension (requires superuser privileges)
-- This would typically be done by your database administrator
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every 5 minutes
-- Note: This requires pg_cron extension and superuser privileges
-- SELECT cron.schedule('order-status-check', '*/5 * * * *', 'SELECT periodic_order_status_check();');

-- Alternative: Create a function that can be called manually or via external cron
CREATE OR REPLACE FUNCTION run_order_maintenance()
RETURNS TABLE(
    maintenance_type TEXT,
    result TEXT,
    timestamp TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'status_check'::TEXT,
        periodic_order_status_check(),
        NOW();
END;
$$ LANGUAGE plpgsql;

-- Test the maintenance function
SELECT * FROM run_order_maintenance();
