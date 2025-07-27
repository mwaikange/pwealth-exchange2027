-- Fix the order matching function to work properly

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS match_orders();

-- Create improved order matching function
CREATE OR REPLACE FUNCTION match_orders()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  buy_order RECORD;
  sell_order RECORD;
  match_amount NUMERIC;
  match_shares NUMERIC;
  matches_made INTEGER := 0;
BEGIN
  -- Loop through pending/partial buy orders (FIFO - oldest first)
  FOR buy_order IN 
    SELECT * FROM buy_orders 
    WHERE status IN ('pending', 'partial') 
    AND (total_amount - amount_filled) > 0
    ORDER BY created_at ASC
  LOOP
    -- Find matching sell orders for this buy order
    FOR sell_order IN
      SELECT * FROM sell_orders 
      WHERE status IN ('available', 'partial')
      AND shares_remaining > 0
      AND price_per_share <= buy_order.price_per_share
      ORDER BY price_per_share ASC, created_at ASC -- Best price first, then FIFO
    LOOP
      -- Calculate how much can be matched
      match_shares := LEAST(
        sell_order.shares_remaining,
        FLOOR((buy_order.total_amount - buy_order.amount_filled) / sell_order.price_per_share)
      );
      
      IF match_shares > 0 THEN
        match_amount := match_shares * sell_order.price_per_share;
        
        -- Update buy order
        UPDATE buy_orders SET
          shares_filled = shares_filled + match_shares,
          amount_filled = amount_filled + match_amount,
          status = CASE 
            WHEN (amount_filled + match_amount) >= total_amount THEN 'filled'::order_status
            ELSE 'partial'::order_status
          END,
          updated_at = NOW()
        WHERE id = buy_order.id;
        
        -- Update sell order  
        UPDATE sell_orders SET
          shares_remaining = shares_remaining - match_shares,
          status = CASE
            WHEN (shares_remaining - match_shares) <= 0 THEN 'matched'::order_status
            ELSE 'partial'::order_status
          END,
          updated_at = NOW()
        WHERE id = sell_order.id;
        
        -- Create matched_orders record
        INSERT INTO matched_orders (
          buy_order_id, sell_order_id, buyer_uuid, seller_uuid,
          shares_matched, price_per_share, total_amount,
          created_at
        ) VALUES (
          buy_order.id, sell_order.id, buy_order.user_uuid, sell_order.user_uuid,
          match_shares, sell_order.price_per_share, match_amount,
          NOW()
        );
        
        -- Transfer shares to buyer's hold_pre wallet
        INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
        VALUES (buy_order.user_uuid, 'hold_pre', match_shares, 'order_match', NOW(), NOW())
        ON CONFLICT (user_uuid, wallet_type) 
        DO UPDATE SET 
          shares = user_shares.shares + match_shares,
          updated_at = NOW();
        
        -- Transfer money to seller's cashout_wallet
        INSERT INTO user_shares (user_uuid, wallet_type, shares, source, created_at, updated_at)
        VALUES (sell_order.user_uuid, 'cashout_wallet', match_amount, 'order_match', NOW(), NOW())
        ON CONFLICT (user_uuid, wallet_type)
        DO UPDATE SET 
          shares = user_shares.shares + match_amount,
          updated_at = NOW();
        
        matches_made := matches_made + 1;
        
        -- Exit inner loop if buy order is fully filled
        EXIT WHEN (buy_order.amount_filled + match_amount) >= buy_order.total_amount;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'matches_made', matches_made,
    'message', 'Order matching completed'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Order matching failed'
  );
END;
$$;
