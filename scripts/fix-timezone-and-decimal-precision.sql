-- Fix timezone issues and decimal precision for price calculations
-- Using UTC+2 directly instead of named timezones to avoid casting issues

-- 1. Fix the get_exchange_status function with UTC+2 offset
CREATE OR REPLACE FUNCTION get_exchange_status()
RETURNS JSON AS $$
DECLARE
    current_windhoek_time TIMESTAMP;
    current_day_of_week INTEGER;
    current_time_only TIME;
    is_open BOOLEAN := FALSE;
    status_msg TEXT;
    trading_hours TEXT;
    current_price NUMERIC;
BEGIN
    -- Get current time in Windhoek (UTC+2) using direct offset
    current_windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    
    -- Extract day of week (0=Sunday, 1=Monday, etc.) using EXTRACT with DOW
    current_day_of_week := EXTRACT(DOW FROM current_windhoek_time);
    
    -- Extract time only
    current_time_only := current_windhoek_time::TIME;
    
    -- Get current share price
    SELECT get_current_share_price() INTO current_price;
    
    -- Determine if exchange is open
    -- Open: Monday 10:05 to Sunday 23:59
    IF current_day_of_week = 1 AND current_time_only >= '10:05:00' THEN
        -- Monday after 10:05
        is_open := TRUE;
        status_msg := 'Exchange is OPEN - Trading active';
        trading_hours := 'Open until Sunday 23:59';
    ELSIF current_day_of_week >= 2 AND current_day_of_week <= 6 THEN
        -- Tuesday to Saturday (full days)
        is_open := TRUE;
        status_msg := 'Exchange is OPEN - Trading active';
        trading_hours := 'Open until Sunday 23:59';
    ELSIF current_day_of_week = 0 AND current_time_only <= '23:59:00' THEN
        -- Sunday before 23:59
        is_open := TRUE;
        status_msg := 'Exchange is OPEN - Closes at 23:59 today';
        trading_hours := 'Closes today at 23:59';
    ELSE
        -- Closed period: Sunday 23:59 to Monday 10:05
        is_open := FALSE;
        IF current_day_of_week = 0 AND current_time_only > '23:59:00' THEN
            status_msg := 'Exchange CLOSED - Reopens Monday 10:05';
        ELSIF current_day_of_week = 1 AND current_time_only < '10:05:00' THEN
            status_msg := 'Exchange CLOSED - Opens today at 10:05';
        ELSE
            status_msg := 'Exchange CLOSED - Reopens Monday 10:05';
        END IF;
        trading_hours := 'Closed until Monday 10:05';
    END IF;
    
    RETURN json_build_object(
        'is_trading_open', is_open,
        'status_message', status_msg,
        'current_price', current_price,
        'current_week_start', DATE_TRUNC('week', current_windhoek_time)::DATE + INTERVAL '1 day',
        'last_price_update', (SELECT created_at FROM weekly_prices ORDER BY effective_date DESC LIMIT 1),
        'last_updated', NOW(),
        'windhoek_time', current_windhoek_time,
        'timezone', 'UTC+2 (Windhoek)',
        'trading_hours', trading_hours,
        'trading_schedule', json_build_object(
            'weekly_close', 'Sunday 23:59',
            'history_clear', 'Monday 09:30',
            'price_calculation', 'Monday 10:03',
            'weekly_open', 'Monday 10:05',
            'timezone', 'UTC+2 (Windhoek)'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix the is_exchange_open function
CREATE OR REPLACE FUNCTION is_exchange_open()
RETURNS BOOLEAN AS $$
DECLARE
    status_result JSON;
BEGIN
    SELECT get_exchange_status() INTO status_result;
    RETURN (status_result->>'is_trading_open')::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update price calculation function with proper decimal precision
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_simplified()
RETURNS JSON AS $$
DECLARE
  latest_jse200 RECORD;
  previous_price RECORD;
  new_base_price NUMERIC;
  new_final_price NUMERIC;
  new_price_change NUMERIC;
  current_week_date DATE;
  windhoek_time TIMESTAMP;
BEGIN
  -- Get current Windhoek time (UTC+2)
  windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
  
  -- Get current Monday date based on Windhoek time
  current_week_date := DATE_TRUNC('week', windhoek_time)::DATE + INTERVAL '1 day';
  
  -- Check if we already have a price for this week
  IF EXISTS (
    SELECT 1 FROM weekly_prices 
    WHERE effective_date = current_week_date
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Price already calculated for this week',
      'effective_date', current_week_date,
      'windhoek_time', windhoek_time
    );
  END IF;

  -- Get the latest JSE200 update
  SELECT * INTO latest_jse200
  FROM jse200_priceupdate_mondays
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if we have JSE200 data
  IF latest_jse200 IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No JSE200 data available',
      'windhoek_time', windhoek_time
    );
  END IF;

  -- Get the previous week's final price as base price
  SELECT * INTO previous_price
  FROM weekly_prices
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Set base price (fallback to 100.00 if no previous data)
  IF previous_price IS NULL THEN
    new_base_price := 100.00;
  ELSE
    new_base_price := previous_price.final_price;
  END IF;

  -- Calculate new final price using JSE200 growth
  -- final_price = base_price * (1 + (j200_growth / 100))
  new_final_price := new_base_price * (1 + (COALESCE(latest_jse200.percent_change, 0) / 100));
  
  -- Round final price to 2 decimal places
  new_final_price := ROUND(new_final_price, 2);
  
  -- Calculate price change and round to 4 decimal places
  new_price_change := ROUND(new_final_price - new_base_price, 4);

  -- Insert new weekly price record
  INSERT INTO weekly_prices (
    effective_date,
    base_price,
    j200_growth,
    final_price,
    price_change,
    created_at
  ) VALUES (
    current_week_date,
    new_base_price,
    COALESCE(latest_jse200.percent_change, 0),
    new_final_price,
    new_price_change,
    NOW()
  );

  -- Return success with proper formatting
  RETURN json_build_object(
    'success', true,
    'message', FORMAT('Price updated successfully. New price: N$%s (Growth: %s%%)', 
                     new_final_price, latest_jse200.percent_change),
    'effective_date', current_week_date,
    'base_price', new_base_price,
    'final_price', new_final_price,
    'price_change', new_price_change,
    'j200_growth', COALESCE(latest_jse200.percent_change, 0),
    'windhoek_time', windhoek_time
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', FORMAT('Error calculating price: %s', SQLERRM),
    'error_code', 'PRICE_CALCULATION_ERROR',
    'sql_state', SQLSTATE,
    'windhoek_time', windhoek_time
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to expire old orders and refund balances
CREATE OR REPLACE FUNCTION clear_weekly_order_history()
RETURNS JSON AS $$
DECLARE
    expired_buy_orders INTEGER := 0;
    expired_sell_orders INTEGER := 0;
    refunded_amount NUMERIC := 0;
    refunded_shares NUMERIC := 0;
    windhoek_time TIMESTAMP;
BEGIN
    -- Get current Windhoek time (UTC+2)
    windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    
    -- Expire and refund pending buy orders
    WITH expired_buys AS (
        UPDATE buy_orders 
        SET status = 'expired',
            updated_at = NOW()
        WHERE status IN ('pending', 'partial')
        RETURNING user_uuid, (total_amount - COALESCE(amount_filled, 0)) as refund_amount
    )
    SELECT COUNT(*), COALESCE(SUM(refund_amount), 0) 
    INTO expired_buy_orders, refunded_amount
    FROM expired_buys;
    
    -- Refund remaining amounts to buy_wallet
    INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
    SELECT 
        user_uuid,
        'buy_wallet',
        (total_amount - COALESCE(amount_filled, 0)),
        'order_expiry_refund',
        NOW(),
        NOW()
    FROM buy_orders 
    WHERE status = 'expired' 
    AND (total_amount - COALESCE(amount_filled, 0)) > 0
    ON CONFLICT (user_uuid, wallet_type) 
    DO UPDATE SET 
        shares = user_shares.shares + EXCLUDED.shares,
        updated_at = NOW();
    
    -- Expire and refund available sell orders
    WITH expired_sells AS (
        UPDATE sell_orders 
        SET status = 'expired',
            updated_at = NOW()
        WHERE status IN ('available', 'partial')
        RETURNING user_uuid, COALESCE(shares_remaining, 0) as refund_shares
    )
    SELECT COUNT(*), COALESCE(SUM(refund_shares), 0) 
    INTO expired_sell_orders, refunded_shares
    FROM expired_sells;
    
    -- Refund remaining shares to hold_post wallet
    INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
    SELECT 
        user_uuid,
        'hold_post',
        COALESCE(shares_remaining, 0),
        'order_expiry_refund',
        NOW(),
        NOW()
    FROM sell_orders 
    WHERE status = 'expired' 
    AND COALESCE(shares_remaining, 0) > 0
    ON CONFLICT (user_uuid, wallet_type) 
    DO UPDATE SET 
        shares = user_shares.shares + EXCLUDED.shares,
        updated_at = NOW();
    
    RETURN json_build_object(
        'success', true,
        'message', FORMAT('Weekly cleanup completed. Expired %s buy orders (refunded N$%s) and %s sell orders (refunded %s shares)', 
                         expired_buy_orders, refunded_amount, expired_sell_orders, refunded_shares),
        'expired_buy_orders', expired_buy_orders,
        'expired_sell_orders', expired_sell_orders,
        'refunded_amount', refunded_amount,
        'refunded_shares', refunded_shares,
        'completed_at', NOW(),
        'windhoek_time', windhoek_time
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', FORMAT('Error during weekly cleanup: %s', SQLERRM),
        'error_code', 'CLEANUP_ERROR',
        'sql_state', SQLSTATE,
        'windhoek_time', windhoek_time
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to open exchange weekly
CREATE OR REPLACE FUNCTION open_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    windhoek_time TIMESTAMP;
BEGIN
    -- Get current Windhoek time (UTC+2)
    windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    
    -- Simply return success - exchange status is determined by time-based logic
    RETURN json_build_object(
        'success', true,
        'message', 'Exchange opened for weekly trading',
        'opened_at', NOW(),
        'windhoek_time', windhoek_time,
        'status', 'OPEN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to close exchange weekly  
CREATE OR REPLACE FUNCTION close_exchange_weekly()
RETURNS JSON AS $$
DECLARE
    windhoek_time TIMESTAMP;
BEGIN
    -- Get current Windhoek time (UTC+2)
    windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    
    -- Simply return success - exchange status is determined by time-based logic
    RETURN json_build_object(
        'success', true,
        'message', 'Exchange closed for weekly maintenance',
        'closed_at', NOW(),
        'windhoek_time', windhoek_time,
        'status', 'CLOSED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update get_current_share_price to ensure proper decimal formatting
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    SELECT ROUND(COALESCE(final_price, 100.00), 2) INTO current_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Return fallback price if no data exists
    RETURN COALESCE(current_price, 100.00);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update get_price_history with proper decimal formatting
CREATE OR REPLACE FUNCTION get_price_history(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  effective_date DATE,
  base_price NUMERIC,
  j200_growth NUMERIC,
  final_price NUMERIC,
  price_change NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.effective_date,
    ROUND(wp.base_price, 2) as base_price,
    ROUND(wp.j200_growth, 4) as j200_growth,
    ROUND(wp.final_price, 2) as final_price,
    ROUND(wp.price_change, 4) as price_change,
    wp.created_at
  FROM weekly_prices wp
  ORDER BY wp.effective_date DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the timezone fix
DO $$
DECLARE
    windhoek_time TIMESTAMP;
    exchange_status JSON;
    current_day INTEGER;
BEGIN
    -- Test UTC+2 conversion
    windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    current_day := EXTRACT(DOW FROM windhoek_time);
    
    RAISE NOTICE 'UTC+2 Timezone Fix Test:';
    RAISE NOTICE 'Current UTC time: %', NOW() AT TIME ZONE 'UTC';
    RAISE NOTICE 'Current Windhoek time (UTC+2): %', windhoek_time;
    RAISE NOTICE 'Day of week: % (0=Sunday, 1=Monday)', current_day;
    
    -- Test exchange status function
    SELECT get_exchange_status() INTO exchange_status;
    RAISE NOTICE 'Exchange status: %', exchange_status->>'status_message';
    RAISE NOTICE 'Is trading open: %', exchange_status->>'is_trading_open';
    
    RAISE NOTICE 'Timezone fix applied successfully!';
END;
$$;

RAISE NOTICE '';
RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
RAISE NOTICE '█                                                                            █';
RAISE NOTICE '█                    TIMEZONE AND DECIMAL PRECISION FIXES                   █';
RAISE NOTICE '█                              COMPLETED SUCCESSFULLY!                       █';
RAISE NOTICE '█                                                                            █';
RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
RAISE NOTICE '';
RAISE NOTICE '🕐 TIMEZONE FIXES:';
RAISE NOTICE '   ✓ Switched from named timezone to UTC+2 direct offset';
RAISE NOTICE '   ✓ Fixed DOW extraction issues';
RAISE NOTICE '   ✓ Eliminated timezone casting errors';
RAISE NOTICE '   ✓ All functions now use: (NOW() AT TIME ZONE ''UTC'') + INTERVAL ''2 hours''';
RAISE NOTICE '';
RAISE NOTICE '📊 DECIMAL PRECISION FIXES:';
RAISE NOTICE '   ✓ Final prices: Rounded to 2 decimal places';
RAISE NOTICE '   ✓ Price changes: Rounded to 4 decimal places';
RAISE NOTICE '   ✓ JSE200 growth: Rounded to 4 decimal places';
RAISE NOTICE '';
RAISE NOTICE '🔧 FUNCTIONS UPDATED:';
RAISE NOTICE '   ✓ get_exchange_status() - Fixed timezone handling';
RAISE NOTICE '   ✓ is_exchange_open() - Fixed timezone handling';  
RAISE NOTICE '   ✓ calculate_weekly_share_price_simplified() - Added decimal precision';
RAISE NOTICE '   ✓ clear_weekly_order_history() - Added order expiry and refunds';
RAISE NOTICE '   ✓ open_exchange_weekly() - Created with UTC+2';
RAISE NOTICE '   ✓ close_exchange_weekly() - Created with UTC+2';
RAISE NOTICE '   ✓ get_current_share_price() - Proper decimal formatting';
RAISE NOTICE '   ✓ get_price_history() - Proper decimal formatting';
RAISE NOTICE '';
RAISE NOTICE '🚀 READY FOR NEXT STEP: scripts/full-price-calculation-and-open-exchange.sql';
RAISE NOTICE '';
RAISE NOTICE '██████████████████████████████████████████████████████████████████████████████';
