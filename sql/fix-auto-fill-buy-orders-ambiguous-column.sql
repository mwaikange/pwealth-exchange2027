-- Fix ambiguous column reference in auto_fill_buy_orders function
-- This resolves the PostgreSQL 42702 error

CREATE OR REPLACE FUNCTION auto_fill_buy_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_price NUMERIC;
  buy_order_record RECORD;
  shares_to_fill NUMERIC;
  amount_to_deduct NUMERIC;
BEGIN
  -- ✅ FIX: Use table alias to avoid ambiguous column reference
  SELECT cpi.current_price INTO latest_price
  FROM current_pricing_info cpi
  ORDER BY cpi.week_start DESC
  LIMIT 1;

  -- If no price found, use fallback
  IF latest_price IS NULL THEN
    latest_price := 100;
  END IF;

  RAISE NOTICE 'Auto-fill using price: %', latest_price;

  -- Process pending buy orders that can be auto-filled
  FOR buy_order_record IN
    SELECT bo.id, bo.user_uuid, bo.total_amount, bo.price_per_share, 
           bo.shares_requested, bo.shares_filled, bo.amount_filled
    FROM buy_orders bo
    WHERE bo.status = 'pending'
      AND bo.price_per_share >= latest_price
    ORDER BY bo.created_at ASC
  LOOP
    -- Calculate how many shares can be filled
    shares_to_fill := (buy_order_record.total_amount - buy_order_record.amount_filled) / latest_price;
    amount_to_deduct := shares_to_fill * latest_price;

    -- Update buy order
    UPDATE buy_orders 
    SET 
      shares_filled = buy_order_record.shares_filled + shares_to_fill,
      amount_filled = buy_order_record.amount_filled + amount_to_deduct,
      status = CASE 
        WHEN (buy_order_record.amount_filled + amount_to_deduct) >= buy_order_record.total_amount 
        THEN 'filled'::order_status 
        ELSE 'partial'::order_status 
      END,
      updated_at = NOW()
    WHERE id = buy_order_record.id;

    -- Add shares to user's hold wallet
    INSERT INTO wallet_transactions (
      user_uuid,
      transaction_type,
      amount,
      wallet_type,
      description,
      created_at
    ) VALUES (
      buy_order_record.user_uuid,
      'buy_order_fill',
      shares_to_fill,
      'hold_wallet',
      'Auto-filled buy order at N$' || latest_price || ' per share',
      NOW()
    );

    RAISE NOTICE 'Auto-filled buy order % with % shares at N$% each', 
      buy_order_record.id, shares_to_fill, latest_price;
  END LOOP;

END;
$$;
