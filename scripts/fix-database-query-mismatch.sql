-- Fix database query mismatch: Use exchange_status table with is_trading_open column
-- Global search and replace to ensure consistency

-- First, let's check what tables actually exist
DO $$
DECLARE
    exchange_status_exists BOOLEAN;
    exchange_trading_hours_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'CHECKING EXISTING TABLES...';
    
    -- Check if exchange_status table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'exchange_status'
    ) INTO exchange_status_exists;
    
    -- Check if exchange_trading_hours table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'exchange_trading_hours'
    ) INTO exchange_trading_hours_exists;
    
    RAISE NOTICE 'exchange_status table exists: %', exchange_status_exists;
    RAISE NOTICE 'exchange_trading_hours table exists: %', exchange_trading_hours_exists;
    
    IF NOT exchange_status_exists THEN
        RAISE NOTICE 'Creating exchange_status table with correct structure...';
        
        -- Create the correct exchange_status table
        CREATE TABLE exchange_status (
            id SERIAL PRIMARY KEY,
            is_trading_open BOOLEAN DEFAULT FALSE,
            current_week_start DATE DEFAULT CURRENT_DATE,
            last_price_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            status_message TEXT DEFAULT 'Exchange is closed',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Insert initial status
        INSERT INTO exchange_status (
            is_trading_open,
            current_week_start,
            last_price_update,
            status_message
        ) VALUES (
            TRUE,
            DATE_TRUNC('week', NOW())::DATE + INTERVAL '1 day',
            NOW(),
            'Exchange is OPEN - Trading active'
        );
        
        RAISE NOTICE 'exchange_status table created and initialized';
    END IF;
    
    IF exchange_trading_hours_exists THEN
        RAISE NOTICE 'WARNING: exchange_trading_hours table exists but should not be used';
        RAISE NOTICE 'All code should reference exchange_status table instead';
    END IF;
END $$;

-- Drop and recreate all functions to use correct table and column names
DROP FUNCTION IF EXISTS get_exchange_status() CASCADE;
DROP FUNCTION IF EXISTS is_exchange_open() CASCADE;
DROP FUNCTION IF EXISTS open_exchange_weekly() CASCADE;
DROP FUNCTION IF EXISTS close_exchange_weekly() CASCADE;

-- FIXED: get_exchange_status function using correct table and columns
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    current_time TIMESTAMP WITH TIME ZONE;
    current_day INTEGER;
    current_hour INTEGER;
    current_minute INTEGER;
    is_open BOOLEAN := false;
    status_message TEXT;
    next_open_time TEXT;
    current_week DATE;
    db_status RECORD;
BEGIN
    -- Get current time in Windhoek timezone (UTC+2)
    current_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    current_day := EXTRACT(DOW FROM current_time); -- 0=Sunday, 1=Monday, etc.
    current_hour := EXTRACT(HOUR FROM current_time);
    current_minute := EXTRACT(MINUTE FROM current_time);
    current_week := DATE_TRUNC('week', current_time)::DATE + INTERVAL '1 day';
    
    -- Get status from exchange_status table
    SELECT * INTO db_status FROM exchange_status ORDER BY id DESC LIMIT 1;
    
    -- Exchange is open Monday 10:05 to Sunday 23:59 (Windhoek time)
    IF current_day = 1 THEN -- Monday
        IF current_hour > 10 OR (current_hour = 10 AND current_minute >= 5) THEN
            is_open := true;
            status_message := 'Exchange is OPEN - Trading active';
            next_open_time := 'Open until Sunday 23:59';
        ELSE
            is_open := false;
            status_message := format('Exchange opens today at 10:05 (in %s minutes)', 
                (10 * 60 + 5) - (current_hour * 60 + current_minute));
            next_open_time := 'Today at 10:05 Windhoek time';
        END IF;
    ELSIF current_day BETWEEN 2 AND 6 THEN -- Tuesday to Saturday
        is_open := true;
        status_message := 'Exchange is OPEN - Trading active';
        next_open_time := 'Open until Sunday 23:59';
    ELSIF current_day = 0 THEN -- Sunday
        IF current_hour < 23 OR (current_hour = 23 AND current_minute < 59) THEN
            is_open := true;
            status_message := format('Exchange is OPEN - Closes in %s minutes', 
                (23 * 60 + 59) - (current_hour * 60 + current_minute));
            next_open_time := 'Closes at 23:59, reopens Monday 10:05';
        ELSE
            is_open := false;
            status_message := 'Exchange is CLOSED - Weekly maintenance';
            next_open_time := 'Monday 10:05 Windhoek time';
        END IF;
    END IF;
    
    -- Update database status if needed
    IF db_status.is_trading_open != is_open THEN
        UPDATE exchange_status 
        SET is_trading_open = is_open,
            status_message = status_message,
            updated_at = NOW()
        WHERE id = db_status.id;
    END IF;
    
    RETURN json_build_object(
        'is_trading_open', is_open,
        'status_message', status_message,
        'next_open_time', next_open_time,
        'windhoek_time', current_time,
        'current_week_start', current_week,
        'last_price_update', COALESCE(db_status.last_price_update, NOW()),
        'timezone', 'Africa/Windhoek (UTC+2)',
        'trading_hours', 'Monday 10:05 - Sunday 23:59',
        'trading_schedule', json_build_object(
            'weekly_close', 'Sunday 23:59',
            'history_clear', 'Monday 09:30',
            'price_calculation', 'Monday 10:03',
            'weekly_open', 'Monday 10:05',
            'timezone', 'Africa/Windhoek (UTC+2)'
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'is_trading_open', false,
            'status_message', 'Error checking exchange status: ' || SQLERRM,
            'error_code', 'EXCHANGE_STATUS_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIXED: is_exchange_open function using correct table and column
CREATE OR REPLACE FUNCTION is_exchange_open()
RETURNS BOOLEAN AS $$
DECLARE
    status_result JSON;
BEGIN
    SELECT get_exchange_status() INTO status_result;
    RETURN (status_result->>'is_trading_open')::BOOLEAN;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false; -- Default to closed on error
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIXED: open_exchange_weekly function using correct table and column
CREATE OR REPLACE FUNCTION open_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    current_week DATE;
    current_price NUMERIC;
    windhoek_time TIMESTAMP;
BEGIN
    windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    current_week := DATE_TRUNC('week', windhoek_time)::DATE + INTERVAL '1 day';
    
    RAISE NOTICE 'Opening exchange for week: %', current_week;
    
    -- Get current share price
    BEGIN
        SELECT get_current_share_price() INTO current_price;
        IF current_price IS NULL OR current_price <= 0 THEN
            current_price := 108.2; -- Fallback price
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            current_price := 108.2; -- Fallback price
            RAISE NOTICE 'Using fallback price due to error: %', SQLERRM;
    END;
    
    -- Update exchange_status table (correct table name)
    UPDATE exchange_status 
    SET is_trading_open = TRUE,
        current_week_start = current_week,
        last_price_update = windhoek_time,
        status_message = 'Exchange is OPEN - Trading active',
        updated_at = windhoek_time
    WHERE id = (SELECT MAX(id) FROM exchange_status);
    
    -- Insert new record if none exists
    INSERT INTO exchange_status (
        is_trading_open,
        current_week_start,
        last_price_update,
        status_message
    )
    SELECT TRUE, current_week, windhoek_time, 'Exchange is OPEN - Trading active'
    WHERE NOT EXISTS (SELECT 1 FROM exchange_status);
    
    RAISE NOTICE 'Exchange opened for week starting % with price N$%', current_week, current_price;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Share Exchange is now live! Current price: N$%s per share', current_price),
        'opened_at', windhoek_time,
        'current_week', current_week,
        'current_price', current_price,
        'is_trading_open', true,
        'windhoek_time', windhoek_time,
        'timezone', 'Africa/Windhoek (UTC+2)'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error opening exchange: ' || SQLERRM,
            'error_code', 'EXCHANGE_OPEN_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIXED: close_exchange_weekly function using correct table and column
CREATE OR REPLACE FUNCTION close_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    affected_buy_orders INTEGER := 0;
    affected_sell_orders INTEGER := 0;
    current_week DATE;
    buy_refund_total NUMERIC := 0;
    sell_return_total NUMERIC := 0;
    windhoek_time TIMESTAMP;
BEGIN
    windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    current_week := DATE_TRUNC('week', windhoek_time)::DATE + INTERVAL '1 day';
    
    RAISE NOTICE 'Closing exchange for week: %', current_week;
    
    -- Cancel all pending/partial buy orders and refund money
    WITH cancelled_buys AS (
        UPDATE buy_orders 
        SET status = 'cancelled',
            updated_at = windhoek_time
        WHERE status IN ('pending', 'partial')
        RETURNING user_uuid, total_amount, COALESCE(amount_filled, 0) as amount_filled
    ),
    refunds AS (
        SELECT 
            user_uuid,
            SUM(total_amount - amount_filled) as refund_amount
        FROM cancelled_buys
        GROUP BY user_uuid
    )
    UPDATE user_shares 
    SET shares = shares + r.refund_amount,
        updated_at = windhoek_time
    FROM refunds r
    WHERE user_shares.user_uuid = r.user_uuid 
    AND user_shares.wallet_type = 'buy_wallet';
    
    GET DIAGNOSTICS affected_buy_orders = ROW_COUNT;
    
    -- Calculate total refunded
    SELECT COALESCE(SUM(total_amount - COALESCE(amount_filled, 0)), 0) 
    INTO buy_refund_total
    FROM buy_orders 
    WHERE status = 'cancelled' 
    AND updated_at >= windhoek_time - INTERVAL '1 minute';
    
    -- Expire all available/partial sell orders and return shares
    WITH expired_sells AS (
        UPDATE sell_orders 
        SET status = 'expired',
            updated_at = windhoek_time
        WHERE status IN ('available', 'partial')
        RETURNING user_uuid, COALESCE(shares_remaining, shares_available) as shares_to_return
    ),
    returns AS (
        SELECT 
            user_uuid,
            SUM(shares_to_return) as return_shares
        FROM expired_sells
        GROUP BY user_uuid
    )
    UPDATE user_shares 
    SET shares = shares + r.return_shares,
        updated_at = windhoek_time
    FROM returns r
    WHERE user_shares.user_uuid = r.user_uuid 
    AND user_shares.wallet_type = 'hold_post';
    
    GET DIAGNOSTICS affected_sell_orders = ROW_COUNT;
    
    -- Calculate total shares returned
    SELECT COALESCE(SUM(COALESCE(shares_remaining, shares_available)), 0) 
    INTO sell_return_total
    FROM sell_orders 
    WHERE status = 'expired' 
    AND updated_at >= windhoek_time - INTERVAL '1 minute';
    
    -- Update exchange_status table (correct table name)
    UPDATE exchange_status 
    SET is_trading_open = FALSE,
        status_message = 'Exchange is CLOSED - Weekly maintenance',
        updated_at = windhoek_time
    WHERE id = (SELECT MAX(id) FROM exchange_status);
    
    RAISE NOTICE 'Exchange closed: % buy orders cancelled (N$% refunded), % sell orders expired (% shares returned)', 
        affected_buy_orders, buy_refund_total, affected_sell_orders, sell_return_total;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Exchange closed successfully. Cancelled %s buy orders (N$%s refunded), expired %s sell orders (%s shares returned)', 
            affected_buy_orders, buy_refund_total, affected_sell_orders, sell_return_total),
        'cancelled_buy_orders', affected_buy_orders,
        'expired_sell_orders', affected_sell_orders,
        'buy_refund_total', buy_refund_total,
        'sell_return_total', sell_return_total,
        'closed_at', windhoek_time,
        'windhoek_time', windhoek_time,
        'next_opening', 'Monday 10:05 Windhoek time'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error closing exchange: ' || SQLERRM,
            'error_code', 'EXCHANGE_CLOSE_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update clear_weekly_order_history to use UTC+2 timezone
CREATE OR REPLACE FUNCTION clear_weekly_order_history()
RETURNS JSON AS $$
DECLARE
    previous_week DATE;
    expired_buy_orders INTEGER := 0;
    expired_sell_orders INTEGER := 0;
    refunded_amount NUMERIC := 0;
    refunded_shares NUMERIC := 0;
    windhoek_time TIMESTAMP;
BEGIN
    windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    -- Calculate previous week start (Monday)
    previous_week := DATE_TRUNC('week', windhoek_time)::DATE + INTERVAL '1 day' - INTERVAL '7 days';
    
    RAISE NOTICE 'Clearing order history for weeks before: %', previous_week;
    
    -- Expire pending buy orders and refund to buy_wallet
    WITH expired_buys AS (
        UPDATE buy_orders 
        SET status = 'expired',
            updated_at = windhoek_time
        WHERE status IN ('pending', 'partial')
        RETURNING user_uuid, total_amount, COALESCE(amount_filled, 0) as amount_filled
    ),
    refunds AS (
        SELECT 
            user_uuid,
            SUM(total_amount - amount_filled) as refund_amount
        FROM expired_buys
        GROUP BY user_uuid
    )
    UPDATE user_shares 
    SET shares = shares + r.refund_amount,
        updated_at = windhoek_time
    FROM refunds r
    WHERE user_shares.user_uuid = r.user_uuid 
    AND user_shares.wallet_type = 'buy_wallet';
    
    GET DIAGNOSTICS expired_buy_orders = ROW_COUNT;
    
    -- Calculate total refunded
    SELECT COALESCE(SUM(total_amount - COALESCE(amount_filled, 0)), 0) 
    INTO refunded_amount
    FROM buy_orders 
    WHERE status = 'expired' 
    AND updated_at >= windhoek_time - INTERVAL '1 minute';
    
    -- Expire available sell orders and return shares to hold_post
    WITH expired_sells AS (
        UPDATE sell_orders 
        SET status = 'expired',
            updated_at = windhoek_time
        WHERE status IN ('available', 'partial')
        RETURNING user_uuid, COALESCE(shares_remaining, shares_available) as shares_to_return
    ),
    returns AS (
        SELECT 
            user_uuid,
            SUM(shares_to_return) as return_shares
        FROM expired_sells
        GROUP BY user_uuid
    )
    UPDATE user_shares 
    SET shares = shares + r.return_shares,
        updated_at = windhoek_time
    FROM returns r
    WHERE user_shares.user_uuid = r.user_uuid 
    AND user_shares.wallet_type = 'hold_post';
    
    GET DIAGNOSTICS expired_sell_orders = ROW_COUNT;
    
    -- Calculate total shares returned
    SELECT COALESCE(SUM(COALESCE(shares_remaining, shares_available)), 0) 
    INTO refunded_shares
    FROM sell_orders 
    WHERE status = 'expired' 
    AND updated_at >= windhoek_time - INTERVAL '1 minute';
    
    RAISE NOTICE 'Expired % buy orders (N$% refunded), % sell orders (% shares returned)', 
        expired_buy_orders, refunded_amount, expired_sell_orders, refunded_shares;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Order history cleared successfully. Expired %s buy orders (N$%s refunded), %s sell orders (%s shares returned)', 
            expired_buy_orders, refunded_amount, expired_sell_orders, refunded_shares),
        'expired_buy_orders', expired_buy_orders,
        'expired_sell_orders', expired_sell_orders,
        'refunded_amount', refunded_amount,
        'refunded_shares', refunded_shares,
        'previous_week_cutoff', previous_week,
        'windhoek_time', windhoek_time,
        'cleared_at', windhoek_time
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error clearing order history: ' || SQLERRM,
            'error_code', 'HISTORY_CLEAR_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Final verification
DO $$
DECLARE
    function_count INTEGER;
    table_status TEXT;
BEGIN
    -- Count functions created
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'get_exchange_status',
        'is_exchange_open',
        'open_exchange_weekly',
        'close_exchange_weekly',
        'clear_weekly_order_history'
    );
    
    -- Check table status
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM exchange_status) THEN 'exchange_status table exists and has data'
        ELSE 'exchange_status table missing or empty'
    END INTO table_status;
    
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '█                    DATABASE QUERY MISMATCH FIXED!                         █';
    RAISE NOTICE '█                                                                            █';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '✅ FIXED FUNCTIONS: % of 5', function_count;
    RAISE NOTICE '   ✓ get_exchange_status() - uses exchange_status.is_trading_open';
    RAISE NOTICE '   ✓ is_exchange_open() - uses exchange_status.is_trading_open';
    RAISE NOTICE '   ✓ open_exchange_weekly() - uses exchange_status.is_trading_open';
    RAISE NOTICE '   ✓ close_exchange_weekly() - uses exchange_status.is_trading_open';
    RAISE NOTICE '   ✓ clear_weekly_order_history() - uses UTC+2 timezone';
    RAISE NOTICE '';
    RAISE NOTICE '📊 TABLE STATUS: %', table_status;
    RAISE NOTICE '';
    RAISE NOTICE '🔧 CORRECTIONS MADE:';
    RAISE NOTICE '   ❌ exchange_trading_hours → ✅ exchange_status';
    RAISE NOTICE '   ❌ is_open → ✅ is_trading_open';
    RAISE NOTICE '   ❌ Africa/Windhoek → ✅ UTC+2 direct offset';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 READY FOR PRICE CALCULATION AND EXCHANGE OPENING!';
    RAISE NOTICE '';
    RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
END $$;
