-- Enhanced Weekly Matching System with Proper Lifecycle Management
-- Run this in Supabase SQL Editor

-- 1. Create weekly_price table for fixed weekly pricing
CREATE TABLE IF NOT EXISTS weekly_price (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start_date DATE NOT NULL UNIQUE,
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_weekly_price_week_start ON weekly_price(week_start_date DESC);

-- 2. Create order_matching_log table for debugging
CREATE TABLE IF NOT EXISTS order_matching_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buy_order_id UUID,
    sell_order_id UUID,
    action TEXT NOT NULL, -- 'matched', 'skipped', 'no_volume', 'price_mismatch'
    reason TEXT,
    shares_attempted NUMERIC(15,4),
    shares_matched NUMERIC(15,4),
    buy_price NUMERIC(10,2),
    sell_price NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enhanced match_orders function with proper sorting and precision
CREATE OR REPLACE FUNCTION match_orders()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    buy_order RECORD;
    sell_order RECORD;
    match_shares NUMERIC(15,4);
    match_amount NUMERIC(15,2);
    matches_made INTEGER := 0;
    total_volume NUMERIC(15,2) := 0;
    current_week_price NUMERIC(10,2);
BEGIN
    -- Get current week's price
    SELECT price INTO current_week_price 
    FROM weekly_price 
    WHERE week_start_date = date_trunc('week', CURRENT_DATE AT TIME ZONE 'Africa/Windhoek')::DATE
    ORDER BY week_start_date DESC 
    LIMIT 1;
    
    -- If no price set for this week, exit
    IF current_week_price IS NULL THEN
        INSERT INTO order_matching_log (action, reason) 
        VALUES ('skipped', 'No weekly price set');
        
        RETURN json_build_object(
            'success', false,
            'message', 'No weekly price set for current week',
            'matches_made', 0
        );
    END IF;
    
    -- Process buy orders with proper sorting (highest price first, oldest first)
    FOR buy_order IN 
        SELECT * FROM buy_orders 
        WHERE status IN ('pending', 'partial')
        AND (total_amount - COALESCE(amount_filled, 0)) > 0.01 -- At least 1 cent remaining
        ORDER BY price_per_share DESC, created_at ASC
    LOOP
        -- Find matching sell orders (lowest price first, oldest first)
        FOR sell_order IN
            SELECT * FROM sell_orders 
            WHERE status IN ('available', 'partial')
            AND ROUND(COALESCE(shares_remaining, shares_available), 4) > 0.0001 -- At least 0.0001 shares remaining
            AND price_per_share <= buy_order.price_per_share -- Price match condition
            ORDER BY price_per_share ASC, created_at ASC
        LOOP
            -- Calculate maximum shares that can be matched (rounded to 4 decimals)
            match_shares := LEAST(
                ROUND(COALESCE(sell_order.shares_remaining, sell_order.shares_available), 4),
                ROUND(FLOOR(((buy_order.total_amount - COALESCE(buy_order.amount_filled, 0)) / sell_order.price_per_share) * 10000) / 10000, 4)
            );
            
            -- Skip if no meaningful volume can be matched
            IF match_shares < 0.0001 THEN
                INSERT INTO order_matching_log (buy_order_id, sell_order_id, action, reason, buy_price, sell_price) 
                VALUES (buy_order.id, sell_order.id, 'skipped', 'Insufficient volume', buy_order.price_per_share, sell_order.price_per_share);
                CONTINUE;
            END IF;
            
            -- Calculate match amount
            match_amount := ROUND(match_shares * sell_order.price_per_share, 2);
            
            -- Log the attempted match
            INSERT INTO order_matching_log (buy_order_id, sell_order_id, action, shares_attempted, shares_matched, buy_price, sell_price) 
            VALUES (buy_order.id, sell_order.id, 'matched', match_shares, match_shares, buy_order.price_per_share, sell_order.price_per_share);
            
            -- Create matched_orders entry
            INSERT INTO matched_orders (
                buy_order_id, sell_order_id, buyer_uuid, seller_uuid,
                shares_matched, price_per_share, total_amount, matched_at
            ) VALUES (
                buy_order.id, sell_order.id, buy_order.user_uuid, sell_order.user_uuid,
                match_shares, sell_order.price_per_share, match_amount, NOW()
            );
            
            -- Update buy order with precise rounding
            UPDATE buy_orders SET
                shares_filled = ROUND(COALESCE(shares_filled, 0) + match_shares, 4),
                amount_filled = ROUND(COALESCE(amount_filled, 0) + match_amount, 2),
                status = CASE 
                    WHEN ROUND(COALESCE(amount_filled, 0) + match_amount, 2) >= total_amount THEN 'filled'::order_status
                    ELSE 'partial'::order_status
                END,
                updated_at = NOW()
            WHERE id = buy_order.id;
            
            -- Update sell order with precise rounding
            UPDATE sell_orders SET
                shares_remaining = ROUND(COALESCE(shares_remaining, shares_available) - match_shares, 4),
                status = CASE
                    WHEN ROUND(COALESCE(shares_remaining, shares_available) - match_shares, 4) <= 0.0001 THEN 'matched'::order_status
                    ELSE 'partial'::order_status
                END,
                updated_at = NOW()
            WHERE id = sell_order.id;
            
            -- Transfer shares to buyer's hold_pre wallet
            INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
            VALUES (buy_order.user_uuid, 'hold_pre', match_shares, 'order_match', NOW(), NOW())
            ON CONFLICT (user_uuid, wallet_type) 
            DO UPDATE SET 
                shares = ROUND(user_shares.shares + match_shares, 4),
                updated_at = NOW();
            
            -- Transfer money to seller's cashout wallet
            INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
            VALUES (sell_order.user_uuid, 'cashout_wallet', match_amount, 'order_match', NOW(), NOW())
            ON CONFLICT (user_uuid, wallet_type)
            DO UPDATE SET 
                shares = ROUND(user_shares.shares + match_amount, 2),
                updated_at = NOW();
            
            -- Update counters
            matches_made := matches_made + 1;
            total_volume := total_volume + match_amount;
            
            -- Refresh buy order data for next iteration
            SELECT * INTO buy_order FROM buy_orders WHERE id = buy_order.id;
            
            -- Exit if buy order is fully filled
            IF buy_order.status = 'filled' THEN
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'matches_made', matches_made,
        'total_volume', total_volume,
        'weekly_price', current_week_price,
        'message', 'Order matching completed successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO order_matching_log (action, reason) 
    VALUES ('error', SQLERRM);
    
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Order matching failed'
    );
END;
$$;

-- 4. Function to set weekly price (runs Monday 09:00)
CREATE OR REPLACE FUNCTION set_weekly_price()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_price NUMERIC(10,2);
    week_start DATE;
BEGIN
    -- Calculate week start (Monday) in Africa/Windhoek timezone
    week_start := date_trunc('week', CURRENT_DATE AT TIME ZONE 'Africa/Windhoek')::DATE;
    
    -- Get new price from current_pricing_info or calculate
    SELECT current_price INTO new_price 
    FROM current_pricing_info 
    ORDER BY week_start DESC 
    LIMIT 1;
    
    -- Fallback to previous week's price + 1% if no pricing info
    IF new_price IS NULL THEN
        SELECT price * 1.01 INTO new_price 
        FROM weekly_price 
        ORDER BY week_start_date DESC 
        LIMIT 1;
        
        -- Ultimate fallback
        IF new_price IS NULL THEN
            new_price := 100.00;
        END IF;
    END IF;
    
    -- Insert or update weekly price
    INSERT INTO weekly_price (week_start_date, price, created_at, updated_at)
    VALUES (week_start, new_price, NOW(), NOW())
    ON CONFLICT (week_start_date) 
    DO UPDATE SET 
        price = new_price,
        updated_at = NOW();
    
    RETURN json_build_object(
        'success', true,
        'week_start', week_start,
        'price', new_price,
        'message', 'Weekly price set successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to set weekly price'
    );
END;
$$;

-- 5. Function to expire old orders (runs Sunday 23:59)
CREATE OR REPLACE FUNCTION expire_weekly_orders()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_buy_count INTEGER := 0;
    expired_sell_count INTEGER := 0;
BEGIN
    -- Expire unfilled buy orders
    UPDATE buy_orders SET
        status = 'expired'::order_status,
        updated_at = NOW()
    WHERE status IN ('pending', 'partial')
    AND created_at < date_trunc('week', CURRENT_DATE AT TIME ZONE 'Africa/Windhoek');
    
    GET DIAGNOSTICS expired_buy_count = ROW_COUNT;
    
    -- Expire unfilled sell orders
    UPDATE sell_orders SET
        status = 'expired'::order_status,
        updated_at = NOW()
    WHERE status IN ('available', 'partial')
    AND created_at < date_trunc('week', CURRENT_DATE AT TIME ZONE 'Africa/Windhoek');
    
    GET DIAGNOSTICS expired_sell_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'expired_buy_orders', expired_buy_count,
        'expired_sell_orders', expired_sell_count,
        'message', 'Weekly order expiration completed'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to expire weekly orders'
    );
END;
$$;

-- 6. Function to check if trading is allowed (used by frontend)
CREATE OR REPLACE FUNCTION is_trading_allowed()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_time TIMESTAMPTZ;
    current_day INTEGER;
    current_hour INTEGER;
    current_minute INTEGER;
    weekly_price_exists BOOLEAN := FALSE;
BEGIN
    -- Get current time in Africa/Windhoek timezone
    current_time := NOW() AT TIME ZONE 'Africa/Windhoek';
    current_day := EXTRACT(DOW FROM current_time); -- 0=Sunday, 1=Monday
    current_hour := EXTRACT(HOUR FROM current_time);
    current_minute := EXTRACT(MINUTE FROM current_time);
    
    -- Check if weekly price exists for current week
    SELECT EXISTS(
        SELECT 1 FROM weekly_price 
        WHERE week_start_date = date_trunc('week', current_time::DATE)::DATE
    ) INTO weekly_price_exists;
    
    -- Trading is NOT allowed if:
    -- 1. Sunday 23:59 - Monday 09:10 (order freeze window)
    -- 2. No weekly price set
    
    IF (current_day = 0) OR -- Sunday
       (current_day = 1 AND (current_hour < 9 OR (current_hour = 9 AND current_minute < 10))) OR -- Monday before 09:10
       (NOT weekly_price_exists) THEN
        
        RETURN json_build_object(
            'trading_allowed', false,
            'reason', CASE 
                WHEN NOT weekly_price_exists THEN 'Weekly price not set'
                WHEN current_day = 0 THEN 'Trading closed on Sunday'
                ELSE 'Trading opens Monday at 09:10'
            END,
            'current_time', current_time,
            'next_trading_window', 
                CASE 
                    WHEN current_day = 0 OR (current_day = 1 AND current_hour < 9) THEN
                        date_trunc('week', current_time) + INTERVAL '1 day 9 hours 10 minutes'
                    ELSE current_time
                END
        );
    ELSE
        RETURN json_build_object(
            'trading_allowed', true,
            'current_time', current_time,
            'weekly_price', (SELECT price FROM weekly_price WHERE week_start_date = date_trunc('week', current_time::DATE)::DATE)
        );
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'trading_allowed', false,
        'error', SQLERRM
    );
END;
$$;

-- 7. Add 'expired' status to order_status enum if not exists
DO $$
BEGIN
    BEGIN
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'expired';
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- 8. Create triggers to auto-match orders after insertion
CREATE OR REPLACE FUNCTION trigger_order_matching()
RETURNS TRIGGER AS $$
BEGIN
    -- Trigger matching after a small delay to allow transaction to complete
    PERFORM pg_notify('order_placed', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_buy_order_matching ON buy_orders;
DROP TRIGGER IF EXISTS trigger_sell_order_matching ON sell_orders;

-- Create triggers
CREATE TRIGGER trigger_buy_order_matching
    AFTER INSERT ON buy_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_order_matching();

CREATE TRIGGER trigger_sell_order_matching
    AFTER INSERT ON sell_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_order_matching();

-- 9. Set up cron jobs for weekly lifecycle
SELECT cron.schedule(
    'set-weekly-price',
    '0 9 * * 1', -- Monday at 09:00 Africa/Windhoek
    $$SELECT set_weekly_price();$$
);

SELECT cron.schedule(
    'expire-weekly-orders', 
    '59 23 * * 0', -- Sunday at 23:59 Africa/Windhoek
    $$SELECT expire_weekly_orders();$$
);

SELECT cron.schedule(
    'match-orders-continuous',
    '*/2 * * * *', -- Every 2 minutes
    $$SELECT match_orders();$$
);

-- 10. Initialize current week's price if not exists
DO $$
DECLARE
    current_week_start DATE;
    current_price NUMERIC(10,2) := 100.00;
BEGIN
    current_week_start := date_trunc('week', CURRENT_DATE)::DATE;
    
    -- Insert initial price for current week if not exists
    INSERT INTO weekly_price (week_start_date, price)
    VALUES (current_week_start, current_price)
    ON CONFLICT (week_start_date) DO NOTHING;
    
    RAISE NOTICE 'Weekly price system initialized for week starting %', current_week_start;
END $$;
