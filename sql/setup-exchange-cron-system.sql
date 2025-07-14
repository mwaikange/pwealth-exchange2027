-- ==============================================
-- EXCHANGE CRON SYSTEM SETUP
-- ==============================================

-- Function 1: High frequency exchange maintenance (30 seconds)
CREATE OR REPLACE FUNCTION high_frequency_exchange_maintenance()
RETURNS TEXT AS $$
DECLARE
    match_result TEXT;
    status_result TEXT;
    log_entry JSONB;
BEGIN
    -- 1. Attempt order matching
    SELECT match_orders() INTO match_result;
    
    -- 2. Fix any incorrect order statuses
    SELECT fix_order_statuses() INTO status_result;
    
    -- 3. Log if any significant changes occurred
    log_entry := jsonb_build_object(
        'match_result', match_result,
        'status_result', status_result,
        'timestamp', NOW()
    );
    
    -- Only log if there were actual changes
    IF match_result != 'No orders to match' OR status_result != 'Fixed 0 order statuses' THEN
        INSERT INTO system_logs (function_name, status, message, details)
        VALUES (
            'high_frequency_exchange_maintenance',
            'success',
            'Exchange maintenance completed',
            log_entry
        );
    END IF;
    
    RETURN 'High frequency maintenance completed: ' || match_result || ' | ' || status_result;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Medium frequency exchange maintenance (5 minutes)
CREATE OR REPLACE FUNCTION medium_frequency_exchange_maintenance()
RETURNS TEXT AS $$
DECLARE
    expired_count INTEGER := 0;
    cleaned_logs INTEGER := 0;
BEGIN
    -- 1. Expire old sell orders (Sunday 23:59 cutoff)
    WITH expired_orders AS (
        UPDATE sell_orders 
        SET status = 'expired'::order_status
        WHERE status IN ('pending', 'partial')
        AND created_at < date_trunc('week', NOW()) - INTERVAL '1 second'
        RETURNING id
    )
    SELECT COUNT(*) INTO expired_count FROM expired_orders;
    
    -- 2. Clean old system logs (keep last 1000 entries)
    DELETE FROM system_logs 
    WHERE id NOT IN (
        SELECT id FROM system_logs 
        ORDER BY created_at DESC 
        LIMIT 1000
    );
    GET DIAGNOSTICS cleaned_logs = ROW_COUNT;
    
    -- 3. Log maintenance activity
    INSERT INTO system_logs (function_name, status, message, details)
    VALUES (
        'medium_frequency_exchange_maintenance',
        'success',
        'Medium frequency maintenance completed',
        jsonb_build_object(
            'expired_orders', expired_count,
            'cleaned_logs', cleaned_logs,
            'timestamp', NOW()
        )
    );
    
    RETURN 'Medium frequency maintenance: expired ' || expired_count || ' orders, cleaned ' || cleaned_logs || ' logs';
END;
$$ LANGUAGE plpgsql;

-- Function 3: Comprehensive exchange check (15 minutes)
CREATE OR REPLACE FUNCTION comprehensive_exchange_check()
RETURNS TEXT AS $$
DECLARE
    system_health JSONB;
    pending_buy_orders INTEGER;
    pending_sell_orders INTEGER;
    total_buy_volume NUMERIC;
    total_sell_volume NUMERIC;
BEGIN
    -- 1. Gather system statistics
    SELECT COUNT(*) INTO pending_buy_orders FROM buy_orders WHERE status = 'pending';
    SELECT COUNT(*) INTO pending_sell_orders FROM sell_orders WHERE status = 'pending';
    SELECT COALESCE(SUM(total_amount - amount_filled), 0) INTO total_buy_volume FROM buy_orders WHERE status IN ('pending', 'partial');
    SELECT COALESCE(SUM(shares_remaining * price_per_share), 0) INTO total_sell_volume FROM sell_orders WHERE status IN ('pending', 'partial');
    
    -- 2. Build system health report
    system_health := jsonb_build_object(
        'timestamp', NOW(),
        'pending_buy_orders', pending_buy_orders,
        'pending_sell_orders', pending_sell_orders,
        'total_buy_volume', total_buy_volume,
        'total_sell_volume', total_sell_volume,
        'market_balance', total_buy_volume - total_sell_volume
    );
    
    -- 3. Log system health
    INSERT INTO system_logs (function_name, status, message, details)
    VALUES (
        'comprehensive_exchange_check',
        'success',
        'System health check completed',
        system_health
    );
    
    RETURN 'System health check completed. Buy orders: ' || pending_buy_orders || ', Sell orders: ' || pending_sell_orders;
END;
$$ LANGUAGE plpgsql;

-- Create a view for easy monitoring
CREATE OR REPLACE VIEW exchange_system_status AS
SELECT 
    'Exchange System Status' as section,
    (SELECT COUNT(*) FROM buy_orders WHERE status = 'pending') as pending_buy_orders,
    (SELECT COUNT(*) FROM buy_orders WHERE status = 'partial') as partial_buy_orders,
    (SELECT COUNT(*) FROM buy_orders WHERE status = 'matched') as matched_buy_orders,
    (SELECT COUNT(*) FROM sell_orders WHERE status = 'pending') as pending_sell_orders,
    (SELECT COUNT(*) FROM sell_orders WHERE status = 'partial') as partial_sell_orders,
    (SELECT COUNT(*) FROM sell_orders WHERE status = 'matched') as matched_sell_orders,
    (SELECT COALESCE(SUM(total_amount - amount_filled), 0) FROM buy_orders WHERE status IN ('pending', 'partial')) as total_buy_demand,
    (SELECT COALESCE(SUM(shares_remaining * price_per_share), 0) FROM sell_orders WHERE status IN ('pending', 'partial')) as total_sell_supply,
    NOW() as last_updated;

-- Note: The actual CRON job setup depends on your PostgreSQL configuration
-- If pg_cron extension is available, you would run:
-- 
-- SELECT cron.schedule('high-frequency-exchange', '30 seconds', 'SELECT high_frequency_exchange_maintenance();');
-- SELECT cron.schedule('medium-frequency-exchange', '*/5 * * * *', 'SELECT medium_frequency_exchange_maintenance();');
-- SELECT cron.schedule('comprehensive-exchange-check', '*/15 * * * *', 'SELECT comprehensive_exchange_check();');

SELECT 'EXCHANGE CRON SYSTEM FUNCTIONS CREATED' as status;
SELECT 'Run: SELECT * FROM exchange_system_status; to monitor' as monitoring_tip;
