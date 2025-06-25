-- 1.  DROP the conflicting overload (price, amount, uuid)
DROP FUNCTION IF EXISTS public.place_buy_order(
  p_price_per_share NUMERIC,
  p_total_amount NUMERIC,
  p_user_uuid UUID
);

-- 2.  (Re-)CREATE the single, unambiguous version your UI expects
CREATE OR REPLACE FUNCTION public.place_buy_order(
  p_user_uuid        UUID,
  p_price_per_share  NUMERIC,
  p_total_amount     NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  shares_requested NUMERIC;
  buy_order_id     UUID;
BEGIN
  --  Minimum check
  IF p_total_amount < 50 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Minimum purchase is N$50'
    );
  END IF;

  --  How many shares?
  shares_requested := p_total_amount / p_price_per_share;

  ---------------------------------------------------------------------------
  --  Wallet deduction (assumes a buy_wallet row exists – adjust as needed)
  ---------------------------------------------------------------------------
  UPDATE user_shares
  SET    shares     = shares - p_total_amount,
         updated_at = NOW()
  WHERE  user_uuid   = p_user_uuid
  AND    wallet_type = 'buy_wallet';

  ---------------------------------------------------------------------------
  --  Create the buy order
  ---------------------------------------------------------------------------
  INSERT INTO buy_orders (
    user_uuid,
    total_amount,
    price_per_share,
    shares_requested,
    status
  )
  VALUES (
    p_user_uuid,
    p_total_amount,
    p_price_per_share,
    shares_requested,
    'pending'
  )
  RETURNING id INTO buy_order_id;

  RETURN jsonb_build_object(
    'success',          TRUE,
    'message',          format(
                         'Buy order queued for %.4f shares at N$%.2f',
                         shares_requested,
                         p_price_per_share
                       ),
    'order_id',         buy_order_id,
    'shares_requested', shares_requested,
    'status',           'pending'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Error: ' || SQLERRM
    );
END;
$$;
