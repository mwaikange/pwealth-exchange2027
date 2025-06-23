-- Drop existing functions
DROP FUNCTION IF EXISTS place_buy_order(UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS place_sell_order(UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS match_orders();

-- 1. Recreate place_buy_order function with correct enum values
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
  -- Validate inputs
  IF p_total_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Total amount must be greater than 0',
      'error_code', 'INVALID_AMOUNT'
    );
  END IF;

  IF p_price_per_share <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Price per share must be greater than 0',
      'error_code', 'INVALID_PRICE'
    );
  END IF;

  -- Calculate shares requested
  shares_requested := FLOOR(p_total_amount / p_price_per_share);
  
  IF shares_requested <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Amount too small to purchase any shares',
      'error_code', 'INSUFFICIENT_AMOUNT'
    );
  END IF;

  -- Insert buy order with correct enum status
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
    0,
    0,
    'pending'::order_status, -- Use enum cast
    NOW(),
    NOW()
  ) RETURNING id INTO order_id;

  -- Log the transaction with correct enum type
  INSERT INTO share_transactions (
    user_uuid,
    transaction_type,
    shares,
    price_per_share,
    total_amount,
    status,
    description,
    created_at
  ) VALUES (
    p_user_uuid,
    'buy_order_placed'::transaction_type, -- Use enum cast
    shares_requested,
    p_price_per_share,
    p_total_amount,
    'pending'::order_status,
    'Placed buy order for ' || shares_requested || ' shares at N$' || p_price_per_share,
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'order_id', order_id,
    'shares_requested', shares_requested,
    'total_amount', p_total_amount,
    'price_per_share', p_price_per_share,
    'message', 'Buy order placed successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Failed to place buy order: ' || SQLERRM,
    'error_code', 'PROCESSING_ERROR'
  );
END;
$$;

-- 2. Recreate place_sell_order function with correct enum values
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
  calculated_total_amount NUMERIC;
  expires_at_timestamp TIMESTAMPTZ;
BEGIN
  -- Validate inputs
  IF p_shares <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Number of shares must be greater than 0',
      'error_code', 'INVALID_SHARES'
    );
  END IF;

  IF p_price_per_share <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Price per share must be greater than 0',
      'error_code', 'INVALID_PRICE'
    );
  END IF;

  -- Calculate total amount
  calculated_total_amount := p_shares * p_price_per_share;

  -- Validate minimum order value
  IF calculated_total_amount < 50 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Minimum sell order value is N$50',
      'error_code', 'MIN_AMOUNT'
    );
  END IF;

  -- Calculate expiry timestamp
  expires_at_timestamp := NOW() + INTERVAL '7 days';

  -- Insert sell order with correct enum status
  INSERT INTO sell_orders (
    user_uuid,
    shares_available,
    shares_remaining,
    total_amount,
    price_per_share,
    status,
    created_at,
    updated_at,
    expires_at
  ) VALUES (
    p_user_uuid,
    p_shares,
    p_shares,
    calculated_total_amount,
    p_price_per_share,
    'available'::order_status, -- Use enum cast
    NOW(),
    NOW(),
    expires_at_timestamp
  ) RETURNING id INTO order_id;

  -- Log the transaction with correct enum type
  INSERT INTO share_transactions (
    user_uuid,
    transaction_type,
    shares,
    price_per_share,
    total_amount,
    status,
    description,
    created_at
  ) VALUES (
    p_user_uuid,
    'sell_order_placed'::transaction_type, -- Use enum cast
    p_shares,
    p_price_per_share,
    calculated_total_amount,
    'pending'::order_status,
    'Placed sell order for ' || p_shares || ' shares at N$' || p_price_per_share,
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'order_id', order_id,
    'shares', p_shares,
    'price_per_share', p_price_per_share,
    'total_amount', calculated_total_amount,
    'expires_at', expires_at_timestamp,
    'message', 'Sell order placed successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Failed to place sell order: ' || SQLERRM,
    'error_code', 'PROCESSING_ERROR'
  );
END;
$$;

-- 3. Recreate match_orders function with correct enum values
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
    WHERE status = 'pending'::order_status
    AND shares_filled < shares_requested
    ORDER BY created_at ASC
  LOOP
    -- Find matching sell orders
    FOR sell_order IN 
      SELECT * FROM sell_orders 
      WHERE status = 'available'::order_status
      AND shares_remaining > 0
      AND price_per_share <= buy_order.price_per_share
      AND expires_at > NOW()
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
          WHEN shares_filled + match_shares >= shares_requested THEN 'completed'::order_status
          ELSE 'partial'::order_status
        END,
        updated_at = NOW()
      WHERE id = buy_order.id;
      
      -- Update sell order
      UPDATE sell_orders SET
        shares_remaining = shares_remaining - match_shares,
        status = CASE 
          WHEN shares_remaining - match_shares <= 0 THEN 'completed'::order_status
          ELSE 'partial'::order_status
        END,
        updated_at = NOW()
      WHERE id = sell_order.id;
      
      -- Log buyer transaction
      INSERT INTO share_transactions (
        user_uuid,
        transaction_type,
        shares,
        price_per_share,
        total_amount,
        status,
        description,
        created_at
      ) VALUES (
        buy_order.user_uuid,
        'shares_purchased'::transaction_type,
        match_shares,
        sell_order.price_per_share,
        match_amount,
        'completed'::order_status,
        'Purchased ' || match_shares || ' shares at N$' || sell_order.price_per_share,
        NOW()
      );
      
      -- Log seller transaction
      INSERT INTO share_transactions (
        user_uuid,
        transaction_type,
        shares,
        price_per_share,
        total_amount,
        status,
        description,
        created_at
      ) VALUES (
        sell_order.user_uuid,
        'shares_sold'::transaction_type,
        match_shares,
        sell_order.price_per_share,
        match_amount,
        'completed'::order_status,
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
  RETURN json_build_object(
    'success', false,
    'message', 'Order matching failed: ' || SQLERRM,
    'error_code', 'PROCESSING_ERROR'
  );
END;
$$;

-- Verify everything is working
SELECT 'All functions recreated with proper enum casting' as result;
