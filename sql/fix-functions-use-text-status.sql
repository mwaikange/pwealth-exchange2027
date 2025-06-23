-- Fix all functions to use TEXT status instead of order_status enum
-- This resolves the "type order_status does not exist" error

-- 1. Fix place_buy_order function
CREATE OR REPLACE FUNCTION place_buy_order(
  p_user_uuid UUID,
  p_price_per_share NUMERIC,
  p_total_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_id UUID;
  shares_requested NUMERIC;
  current_market_price NUMERIC;
BEGIN
  -- Get current market price from pricing info
  SELECT cpi.current_price INTO current_market_price
  FROM current_pricing_info cpi
  ORDER BY cpi.week_start DESC
  LIMIT 1;

  -- Fallback if no price found
  IF current_market_price IS NULL THEN
    current_market_price := 100;
  END IF;

  -- Calculate shares requested
  shares_requested := p_total_amount / p_price_per_share;

  -- Insert buy order with TEXT status
  INSERT INTO buy_orders (
    user_uuid,
    total_amount,
    price_per_share,
    shares_requested,
    shares_filled,
    amount_filled,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_user_uuid,
    p_total_amount,
    p_price_per_share,
    shares_requested,
    0, -- shares_filled starts at 0
    0, -- amount_filled starts at 0
    'pending', -- TEXT value, not enum
    NOW(),
    NOW()
  ) RETURNING id INTO order_id;

  -- Log the transaction
  INSERT INTO wallet_transactions (
    user_uuid,
    transaction_type,
    amount,
    wallet_type,
    description,
    created_at
  ) VALUES (
    p_user_uuid,
    'buy_order_placed',
    -p_total_amount,
    'buy_wallet',
    'Placed buy order for ' || shares_requested || ' shares at N$' || p_price_per_share,
    NOW()
  );

  RAISE NOTICE 'Buy order placed: ID=%, Amount=N$%, Price=N$%, Shares=%', 
    order_id, p_total_amount, p_price_per_share, shares_requested;

  RETURN json_build_object(
    'success', true,
    'order_id', order_id,
    'shares_requested', shares_requested,
    'message', 'Buy order placed successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to place buy order: %', SQLERRM;
END;
$$;

-- 2. Fix place_sell_order function
CREATE OR REPLACE FUNCTION place_sell_order(
  p_user_uuid UUID,
  p_price_per_share NUMERIC,
  p_shares NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_id UUID;
  current_market_price NUMERIC;
BEGIN
  -- Get current market price
  SELECT cpi.current_price INTO current_market_price
  FROM current_pricing_info cpi
  ORDER BY cpi.week_start DESC
  LIMIT 1;

  -- Fallback if no price found
  IF current_market_price IS NULL THEN
    current_market_price := 100;
  END IF;

  -- Insert sell order with TEXT status
  INSERT INTO sell_orders (
    user_uuid,
    shares_available,
    shares_remaining,
    price_per_share,
    status,
    created_at,
    updated_at,
    expires_at
  ) VALUES (
    p_user_uuid,
    p_shares,
    p_shares,
    p_price_per_share,
    'available', -- TEXT value, not enum
    NOW(),
    NOW(),
    NOW() + INTERVAL '7 days'
  ) RETURNING id INTO order_id;

  RAISE NOTICE 'Sell order placed: ID=%, Shares=%, Price=N$%', 
    order_id, p_shares, p_price_per_share;

  RETURN json_build_object(
    'success', true,
    'order_id', order_id,
    'shares', p_shares,
    'message', 'Sell order placed successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to place sell order: %', SQLERRM;
END;
$$;

-- 3. Fix match_orders function
CREATE OR REPLACE FUNCTION match_orders()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  buy_order RECORD;
  sell_order RECORD;
  match_shares NUMERIC;
  match_amount NUMERIC;
  matches_made INTEGER := 0;
BEGIN
  -- Loop through pending buy orders
  FOR buy_order IN 
    SELECT * FROM buy_orders 
    WHERE status = 'pending' 
    AND shares_filled < shares_requested
    ORDER BY created_at ASC
  LOOP
    -- Find matching sell orders
    FOR sell_order IN 
      SELECT * FROM sell_orders 
      WHERE status = 'available' 
      AND shares_remaining > 0
      AND price_per_share <= buy_order.price_per_share
      ORDER BY price_per_share ASC, created_at ASC
    LOOP
      -- Calculate match quantity
      match_shares := LEAST(
        buy_order.shares_requested - buy_order.shares_filled,
        sell_order.shares_remaining
      );
      
      match_amount := match_shares * sell_order.price_per_share;
      
      -- Update buy order
      UPDATE buy_orders SET
        shares_filled = shares_filled + match_shares,
        amount_filled = amount_filled + match_amount,
        status = CASE 
          WHEN shares_filled + match_shares >= shares_requested THEN 'filled'
          ELSE 'partial'
        END,
        updated_at = NOW()
      WHERE id = buy_order.id;
      
      -- Update sell order
      UPDATE sell_orders SET
        shares_remaining = shares_remaining - match_shares,
        status = CASE 
          WHEN shares_remaining - match_shares <= 0 THEN 'completed'
          ELSE 'partial'
        END,
        updated_at = NOW()
      WHERE id = sell_order.id;
      
      -- Add shares to buyer's hold wallet
      INSERT INTO wallet_transactions (
        user_uuid,
        transaction_type,
        amount,
        wallet_type,
        description,
        created_at
      ) VALUES (
        buy_order.user_uuid,
        'shares_purchased',
        match_shares,
        'hold_wallet',
        'Purchased ' || match_shares || ' shares at N$' || sell_order.price_per_share,
        NOW()
      );
      
      -- Add cash to seller's buy wallet
      INSERT INTO wallet_transactions (
        user_uuid,
        transaction_type,
        amount,
        wallet_type,
        description,
        created_at
      ) VALUES (
        sell_order.user_uuid,
        'shares_sold',
        match_amount,
        'buy_wallet',
        'Sold ' || match_shares || ' shares at N$' || sell_order.price_per_share,
        NOW()
      );
      
      matches_made := matches_made + 1;
      
      -- Exit if buy order is fully filled
      EXIT WHEN buy_order.shares_requested - buy_order.shares_filled <= match_shares;
    END LOOP;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'matches_made', matches_made,
    'message', matches_made || ' order matches completed'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Order matching failed: %', SQLERRM;
END;
$$;

-- 4. Verify the functions work
SELECT 'Functions updated successfully. Valid status values:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM buy_orders 
GROUP BY status
UNION ALL
SELECT DISTINCT status, COUNT(*) as count 
FROM sell_orders 
GROUP BY status;
