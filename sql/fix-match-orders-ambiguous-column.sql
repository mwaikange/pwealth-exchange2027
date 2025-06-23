-- Fix any ambiguous column references in match_orders function
-- This ensures all price references are properly qualified

CREATE OR REPLACE FUNCTION match_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_market_price NUMERIC;
  buy_order_record RECORD;
  sell_order_record RECORD;
  shares_to_match NUMERIC;
  amount_to_transfer NUMERIC;
BEGIN
  -- ✅ FIX: Use table alias and different variable name to avoid conflicts
  SELECT cpi.current_price INTO current_market_price
  FROM current_pricing_info cpi
  ORDER BY cpi.week_start DESC
  LIMIT 1;

  -- Fallback price if none found
  IF current_market_price IS NULL THEN
    current_market_price := 100;
  END IF;

  RAISE NOTICE 'Matching orders at market price: N$%', current_market_price;

  -- First, auto-fill any pending buy orders
  PERFORM auto_fill_buy_orders();

  -- Match buy orders with sell orders
  FOR buy_order_record IN
    SELECT bo.id, bo.user_uuid, bo.total_amount, bo.price_per_share,
           bo.shares_requested, bo.shares_filled, bo.amount_filled
    FROM buy_orders bo
    WHERE bo.status IN ('pending', 'partial')
      AND bo.price_per_share >= current_market_price
    ORDER BY bo.created_at ASC
  LOOP
    -- Find matching sell orders
    FOR sell_order_record IN
      SELECT so.id, so.user_uuid, so.shares_available, so.shares_remaining, so.price_per_share
      FROM sell_orders so
      WHERE so.status IN ('available', 'partial')
        AND so.price_per_share <= buy_order_record.price_per_share
        AND so.user_uuid != buy_order_record.user_uuid -- Can't match with yourself
      ORDER BY so.price_per_share ASC, so.created_at ASC
    LOOP
      -- Calculate shares to match
      shares_to_match := LEAST(
        (buy_order_record.total_amount - buy_order_record.amount_filled) / sell_order_record.price_per_share,
        sell_order_record.shares_remaining
      );

      EXIT WHEN shares_to_match <= 0;

      amount_to_transfer := shares_to_match * sell_order_record.price_per_share;

      -- Update buy order
      UPDATE buy_orders 
      SET 
        shares_filled = buy_order_record.shares_filled + shares_to_match,
        amount_filled = buy_order_record.amount_filled + amount_to_transfer,
        status = CASE 
          WHEN (buy_order_record.amount_filled + amount_to_transfer) >= buy_order_record.total_amount 
          THEN 'filled'::order_status 
          ELSE 'partial'::order_status 
        END,
        updated_at = NOW()
      WHERE id = buy_order_record.id;

      -- Update sell order
      UPDATE sell_orders 
      SET 
        shares_remaining = sell_order_record.shares_remaining - shares_to_match,
        status = CASE 
          WHEN (sell_order_record.shares_remaining - shares_to_match) <= 0 
          THEN 'completed'::order_status 
          ELSE 'partial'::order_status 
        END,
        updated_at = NOW()
      WHERE id = sell_order_record.id;

      -- Transfer shares from seller to buyer
      INSERT INTO wallet_transactions (
        user_uuid, transaction_type, amount, wallet_type, description, created_at
      ) VALUES (
        buy_order_record.user_uuid, 'buy_match', shares_to_match, 'hold_wallet',
        'Bought ' || shares_to_match || ' shares at N$' || sell_order_record.price_per_share,
        NOW()
      );

      -- Transfer money from buyer to seller
      INSERT INTO wallet_transactions (
        user_uuid, transaction_type, amount, wallet_type, description, created_at
      ) VALUES (
        sell_order_record.user_uuid, 'sell_match', amount_to_transfer, 'buy_wallet',
        'Sold ' || shares_to_match || ' shares at N$' || sell_order_record.price_per_share,
        NOW()
      );

      RAISE NOTICE 'Matched % shares between buy order % and sell order % at N$%', 
        shares_to_match, buy_order_record.id, sell_order_record.id, sell_order_record.price_per_share;

      -- Update local variables for next iteration
      buy_order_record.amount_filled := buy_order_record.amount_filled + amount_to_transfer;
      sell_order_record.shares_remaining := sell_order_record.shares_remaining - shares_to_match;

      -- Exit if buy order is fully filled or sell order is empty
      EXIT WHEN buy_order_record.amount_filled >= buy_order_record.total_amount;
      EXIT WHEN sell_order_record.shares_remaining <= 0;
    END LOOP;

    -- Exit if buy order is fully filled
    EXIT WHEN buy_order_record.amount_filled >= buy_order_record.total_amount;
  END LOOP;

END;
$$;
