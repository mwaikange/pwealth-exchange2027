-- Ensure place_buy_order function uses correct column references
-- and properly handles the current pricing info

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
  -- ✅ FIX: Use table alias to avoid ambiguous references
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

  -- Insert buy order
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
    'pending'::order_status,
    NOW(),
    NOW()
  ) RETURNING id INTO order_id;

  -- Log the transaction (deduction from buy_wallet should already be done in frontend)
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
    -p_total_amount, -- Negative because it's a deduction
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
