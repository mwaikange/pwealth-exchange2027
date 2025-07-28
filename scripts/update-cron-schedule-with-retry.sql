-- Clean up and update cron jobs with new schedule and retry logic
-- New schedule: Sunday 23:59 close, Monday 09:30 clear history, Monday 10:03 price calc, Monday 10:05 open

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove ALL existing weekly cron jobs (clean slate)
SELECT cron.unschedule('weekly-exchange-close');
SELECT cron.unschedule('weekly-exchange-open');
SELECT cron.unschedule('weekly-history-clear');
SELECT cron.unschedule('weekly-price-calculation');
SELECT cron.unschedule('weekly-price-calculation-simplified');
SELECT cron.unschedule('weekly-share-price-calculation');
SELECT cron.unschedule('weekly-share-price-simplified');

-- Create retry mechanism for price calculation
CREATE OR REPLACE FUNCTION calculate_price_with_retry()
RETURNS JSON AS $$
DECLARE
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 5;
    retry_delay INTEGER := 3; -- seconds
    result JSON;
    success BOOLEAN := FALSE;
BEGIN
    WHILE attempt_count < max_attempts AND NOT success LOOP
        attempt_count := attempt_count + 1;
        
        BEGIN
            -- Try to calculate the price
            SELECT calculate_weekly_share_price_simplified() INTO result;
            
            -- Check if the result indicates success
            IF (result->>'success')::BOOLEAN = TRUE THEN
                success := TRUE;
                
                -- Log successful attempt
                INSERT INTO system_logs (log_level, message, details, created_at)
                VALUES (
                    'INFO',
                    'Price calculation successful',
                    json_build_object(
                        'attempt', attempt_count,
                        'result', result
                    ),
                    NOW()
                );
                
                RETURN json_build_object(
                    'success', true,
                    'message', 'Price calculation completed successfully',
                    'attempt', attempt_count,
                    'result', result,
                    'completed_at', NOW()
                );
            ELSE
                -- Log failed attempt
                INSERT INTO system_logs (log_level, message, details, created_at)
                VALUES (
                    'WARNING',
                    'Price calculation failed - attempt ' || attempt_count,
                    json_build_object(
                        'attempt', attempt_count,
                        'result', result,
                        'will_retry', (attempt_count < max_attempts)
                    ),
                    NOW()
                );
                
                -- Wait before retry (simulate delay)
                IF attempt_count < max_attempts THEN
                    PERFORM pg_sleep(retry_delay);
                END IF;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log exception
                INSERT INTO system_logs (log_level, message, details, created_at)
                VALUES (
                    'ERROR',
                    'Price calculation exception - attempt ' || attempt_count,
                    json_build_object(
                        'attempt', attempt_count,
                        'error', SQLERRM,
                        'will_retry', (attempt_count < max_attempts)
                    ),
                    NOW()
                );
                
                -- Wait before retry
                IF attempt_count < max_attempts THEN
                    PERFORM pg_sleep(retry_delay);
                END IF;
        END;
    END LOOP;
    
    -- If we get here, all attempts failed
    INSERT INTO system_logs (log_level, message, details, created_at)
    VALUES (
        'ERROR',
        'Price calculation failed after all retry attempts',
        json_build_object(
            'total_attempts', attempt_count,
            'max_attempts', max_attempts
        ),
        NOW()
    );
    
    RETURN json_build_object(
        'success', false,
        'message', 'Price calculation failed after ' || max_attempts || ' attempts',
        'total_attempts', attempt_count,
        'failed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create system_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY,
    log_level TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSON,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policy for system_logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System logs are viewable by authenticated users" ON system_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create chronological cron jobs with new schedule
-- 1. Close exchange every Sunday at 23:59 (unchanged)
SELECT cron.schedule(
    'weekly-exchange-close',
    '59 23 * * 0',  -- Sunday 23:59
    'SELECT close_exchange_weekly();'
);

-- 2. Clear order history every Monday at 09:30 (updated from 09:23)
SELECT cron.schedule(
    'weekly-history-clear',
    '30 9 * * 1',   -- Monday 09:30
    'SELECT clear_weekly_order_history();'
);

-- 3. Calculate new share price every Monday at 10:03 with retry logic (updated from 09:20)
SELECT cron.schedule(
    'weekly-price-calculation',
    '3 10 * * 1',   -- Monday 10:03
    'SELECT calculate_price_with_retry();'
);

-- 4. Open exchange every Monday at 10:05 (updated from 09:25)
SELECT cron.schedule(
    'weekly-exchange-open',
    '5 10 * * 1',   -- Monday 10:05
    'SELECT open_exchange_weekly();'
);

-- Update exchange status messages to reflect new times
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    current_time TIMESTAMPTZ := NOW();
    current_day INTEGER := EXTRACT(DOW FROM current_time); -- 0=Sunday, 1=Monday
    current_hour INTEGER := EXTRACT(HOUR FROM current_time);
    current_minute INTEGER := EXTRACT(MINUTE FROM current_time);
    is_trading_open BOOLEAN := FALSE;
    status_message TEXT;
    current_price NUMERIC;
    current_week_start DATE;
    last_price_update TIMESTAMPTZ;
BEGIN
    -- Get current price
    SELECT get_current_share_price() INTO current_price;
    
    -- Get current week start (Monday)
    current_week_start := DATE_TRUNC('week', current_time)::DATE + INTERVAL '1 day';
    
    -- Get last price update
    SELECT effective_date INTO last_price_update
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Determine if exchange is open based on new schedule
    -- Trading is open Monday 10:05 to Sunday 23:59
    IF current_day = 0 THEN -- Sunday
        IF current_hour < 23 OR (current_hour = 23 AND current_minute < 59) THEN
            is_trading_open := TRUE;
            status_message := 'Share Exchange is live! Current price: N$' || current_price || ' per share';
        ELSE
            is_trading_open := FALSE;
            status_message := 'Exchange closing for weekly reset - trading resumes Monday at 10:05 (Windhoek time)';
        END IF;
    ELSIF current_day = 1 THEN -- Monday
        IF current_hour < 10 OR (current_hour = 10 AND current_minute < 5) THEN
            is_trading_open := FALSE;
            IF current_hour < 9 OR (current_hour = 9 AND current_minute < 30) THEN
                status_message := 'Exchange closed - preparing for weekly reset';
            ELSIF current_hour = 9 AND current_minute >= 30 AND current_hour < 10 THEN
                status_message := 'Clearing previous week history...';
            ELSIF current_hour = 10 AND current_minute < 3 THEN
                status_message := 'Calculating new share price...';
            ELSIF current_hour = 10 AND current_minute >= 3 AND current_minute < 5 THEN
                status_message := 'New price calculated - opening exchange at 10:05';
            END IF;
        ELSE
            is_trading_open := TRUE;
            status_message := 'Share Exchange is live! Current price: N$' || current_price || ' per share';
        END IF;
    ELSE -- Tuesday to Saturday
        is_trading_open := TRUE;
        status_message := 'Share Exchange is live! Current price: N$' || current_price || ' per share';
    END IF;
    
    RETURN json_build_object(
        'is_trading_open', is_trading_open,
        'status_message', status_message,
        'current_price', current_price,
        'current_week_start', current_week_start,
        'last_price_update', last_price_update,
        'last_updated', current_time,
        'trading_hours', json_build_object(
            'opens', 'Monday 10:05 (Windhoek time)',
            'closes', 'Sunday 23:59 (Windhoek time)',
            'timezone', 'Africa/Windhoek'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the close exchange function to reflect new opening time
CREATE OR REPLACE FUNCTION close_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    expired_sell_orders INTEGER := 0;
    cancelled_buy_orders INTEGER := 0;
    total_shares_returned NUMERIC := 0;
    total_funds_returned NUMERIC := 0;
BEGIN
    -- Process expired sell orders
    WITH expired_sells AS (
        UPDATE sell_orders 
        SET 
            status = 'expired',
            updated_at = NOW()
        WHERE status IN ('available', 'partial')
        RETURNING user_uuid, shares_remaining
    ),
    share_returns AS (
        UPDATE user_shares 
        SET 
            hold_post = hold_post + expired_sells.shares_remaining,
            updated_at = NOW()
        FROM expired_sells
        WHERE user_shares.user_uuid = expired_sells.user_uuid
        RETURNING expired_sells.shares_remaining
    )
    SELECT COUNT(*), COALESCE(SUM(shares_remaining), 0)
    INTO expired_sell_orders, total_shares_returned
    FROM expired_sells;
    
    -- Process cancelled buy orders
    WITH cancelled_buys AS (
        UPDATE buy_orders 
        SET 
            status = 'cancelled',
            updated_at = NOW()
        WHERE status IN ('pending', 'partial')
        RETURNING user_uuid, (total_amount - COALESCE(amount_filled, 0)) as refund_amount
    ),
    fund_returns AS (
        UPDATE user_shares 
        SET 
            buy_wallet = buy_wallet + cancelled_buys.refund_amount,
            updated_at = NOW()
        FROM cancelled_buys
        WHERE user_shares.user_uuid = cancelled_buys.user_uuid
        RETURNING cancelled_buys.refund_amount
    )
    SELECT COUNT(*), COALESCE(SUM(refund_amount), 0)
    INTO cancelled_buy_orders, total_funds_returned
    FROM cancelled_buys;
    
    -- Log the closure
    INSERT INTO system_logs (log_level, message, details, created_at)
    VALUES (
        'INFO',
        'Weekly exchange closure completed',
        json_build_object(
            'expired_sell_orders', expired_sell_orders,
            'cancelled_buy_orders', cancelled_buy_orders,
            'total_shares_returned', total_shares_returned,
            'total_funds_returned', total_funds_returned,
            'next_opening', 'Monday 10:05 (Windhoek time)'
        ),
        NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Exchange closed for weekly reset',
        'expired_sell_orders', expired_sell_orders,
        'cancelled_buy_orders', cancelled_buy_orders,
        'total_shares_returned', total_shares_returned,
        'total_funds_returned', total_funds_returned,
        'next_opening', 'Monday 10:05 (Windhoek time)',
        'closed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the open exchange function
CREATE OR REPLACE FUNCTION open_exchange_weekly()
RETURNS JSON AS $$
BEGIN
    -- Log the opening
    INSERT INTO system_logs (log_level, message, details, created_at)
    VALUES (
        'INFO',
        'Weekly exchange opening completed',
        json_build_object(
            'current_price', get_current_share_price(),
            'opened_at', NOW(),
            'next_closure', 'Sunday 23:59 (Windhoek time)'
        ),
        NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Exchange is now open for trading',
        'current_price', get_current_share_price(),
        'opened_at', NOW(),
        'next_closure', 'Sunday 23:59 (Windhoek time)'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the new cron jobs
SELECT 
    jobname,
    schedule,
    command,
    active,
    jobid
FROM cron.job 
WHERE jobname LIKE 'weekly-%'
ORDER BY 
    CASE jobname
        WHEN 'weekly-exchange-close' THEN 1
        WHEN 'weekly-history-clear' THEN 2
        WHEN 'weekly-price-calculation' THEN 3
        WHEN 'weekly-exchange-open' THEN 4
        ELSE 5
    END;

-- Create a function to view system logs
CREATE OR REPLACE FUNCTION get_system_logs(limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
    id BIGINT,
    log_level TEXT,
    message TEXT,
    details JSON,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.id,
        sl.log_level,
        sl.message,
        sl.details,
        sl.created_at
    FROM system_logs sl
    ORDER BY sl.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log the update completion
DO $$
BEGIN
    RAISE NOTICE 'Cron jobs updated with new schedule:';
    RAISE NOTICE '- Sunday 23:59: Close exchange';
    RAISE NOTICE '- Monday 09:30: Clear order history';
    RAISE NOTICE '- Monday 10:03: Calculate price (with 5 retry attempts)';
    RAISE NOTICE '- Monday 10:05: Open exchange';
    RAISE NOTICE '';
    RAISE NOTICE 'New trading hours: Monday 10:05 - Sunday 23:59 (Windhoek time)';
    RAISE NOTICE 'Use SELECT get_system_logs(); to view operation logs';
END $$;
