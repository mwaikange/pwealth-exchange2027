-- =================================================================
-- CONSOLIDATED EXCHANGE LOGIC FIX (v4)
-- This script fixes the cron job permission error by using a safe,
-- conditional scheduling block.
--
-- It will:
-- 1. DROP all previous, conflicting versions of the exchange functions.
-- 2. CREATE the simple order reference generator.
-- 3. CREATE the definitive `place_sell_order` and `place_buy_order` functions.
-- 4. CREATE the definitive `match_orders` function.
-- 5. SAFELY CREATE the recurring cron job to run the matching engine.
-- =================================================================

BEGIN;

-- STEP 1: Clean up all old and conflicting functions.
DROP FUNCTION IF EXISTS public.place_sell_order(p_price_per_share numeric, p_shares numeric, p_user_uuid uuid);
DROP FUNCTION IF EXISTS public.place_sell_order(p_user_uuid uuid, p_price_per_share numeric, p_shares numeric);
DROP FUNCTION IF EXISTS public.place_buy_order(p_user_uuid uuid, p_total_amount numeric);
DROP FUNCTION IF EXISTS public.place_buy_order_with_delay(uuid, numeric, numeric, integer);
DROP FUNCTION IF EXISTS public.generate_simple_order_ref(text);
DROP FUNCTION IF EXISTS public.match_orders();


-- STEP 2: Create the correct helper function for simple references.
CREATE OR REPLACE FUNCTION public.generate_simple_order_ref(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    v_random_digits TEXT;
BEGIN
    v_random_digits := LPAD(floor(random() * 1000000)::int::text, 6, '0');
    RETURN p_prefix || '_' || v_random_digits;
END;
$$ LANGUAGE plpgsql VOLATILE;

GRANT EXECUTE ON FUNCTION public.generate_simple_order_ref(TEXT) TO authenticated;


-- STEP 3: Create the single, definitive `place_sell_order` function.
CREATE OR REPLACE FUNCTION public.place_sell_order(p_user_uuid uuid, p_shares numeric, p_price_per_share numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    total_amount NUMERIC;
    user_post_hold_balance NUMERIC;
    sell_order_id UUID;
    expires_at TIMESTAMPTZ;
    v_sell_ref TEXT;
BEGIN
    total_amount := p_shares * p_price_per_share;
    IF total_amount < 50 THEN
        RETURN json_build_object('success', false, 'message', 'Minimum sell order value is N$50.');
    END IF;

    SELECT COALESCE(shares, 0) INTO user_post_hold_balance
    FROM public.user_shares
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';

    IF user_post_hold_balance < p_shares THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient shares in Post-Hold wallet.');
    END IF;

    UPDATE public.user_shares SET shares = shares - p_shares WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';

    v_sell_ref := public.generate_simple_order_ref('Sell');
    expires_at := DATE_TRUNC('week', NOW()) + INTERVAL '6 days 23 hours 59 minutes';

    INSERT INTO public.sell_orders (user_uuid, shares_available, shares_remaining, total_amount, price_per_share, status, expires_at, sell_ref)
    VALUES (p_user_uuid, p_shares, p_shares, total_amount, p_price_per_share, 'available', expires_at, v_sell_ref)
    RETURNING id INTO sell_order_id;

    RETURN json_build_object('success', true, 'message', 'Sell order placed successfully.', 'order_id', sell_order_id, 'sell_ref', v_sell_ref);
EXCEPTION
    WHEN OTHERS THEN
        UPDATE public.user_shares SET shares = shares + p_shares WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';
        RETURN json_build_object('success', false, 'message', 'Error processing sell order: ' || SQLERRM);
END;
$function$;


-- STEP 4: Create the single, definitive `place_buy_order` function.
CREATE OR REPLACE FUNCTION public.place_buy_order(p_user_uuid uuid, p_total_amount numeric, p_price_per_share numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    shares_to_buy NUMERIC;
    user_buy_balance NUMERIC;
    v_buy_ref TEXT;
    buy_order_id UUID;
BEGIN
    IF p_total_amount < 50 THEN
        RETURN json_build_object('success', false, 'message', 'Minimum buy order is N$50.');
    END IF;

    shares_to_buy := floor(p_total_amount / p_price_per_share);
    IF shares_to_buy = 0 THEN
        RETURN json_build_object('success', false, 'message', 'Amount too small to buy any shares.');
    END IF;

    SELECT COALESCE(shares, 0) INTO user_buy_balance FROM public.user_shares WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';
    IF user_buy_balance < p_total_amount THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient funds in Buy Wallet.');
    END IF;

    UPDATE public.user_shares SET shares = shares - p_total_amount WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

    v_buy_ref := public.generate_simple_order_ref('Buy');

    INSERT INTO public.buy_orders (user_uuid, shares_requested, total_amount, price_per_share, status, buy_ref)
    VALUES (p_user_uuid, shares_to_buy, p_total_amount, p_price_per_share, 'available', v_buy_ref)
    RETURNING id INTO buy_order_id;

    RETURN json_build_object('success', true, 'message', 'Buy order placed successfully.', 'order_id', buy_order_id, 'buy_ref', v_buy_ref);
EXCEPTION
    WHEN OTHERS THEN
        UPDATE public.user_shares SET shares = shares + p_total_amount WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';
        RETURN json_build_object('success', false, 'message', 'Error processing buy order: ' || SQLERRM);
END;
$function$;


-- STEP 5: Create the new `match_orders` function.
CREATE OR REPLACE FUNCTION public.match_orders()
RETURNS INTEGER AS $$
DECLARE
    matches_made INTEGER := 0;
    buy_order RECORD;
    sell_order RECORD;
    shares_to_match NUMERIC;
    amount_to_match NUMERIC;
    share_price NUMERIC;
BEGIN
    SELECT current_price INTO share_price FROM public.current_pricing_info ORDER BY week_start DESC LIMIT 1;
    IF share_price IS NULL THEN
        share_price := 100.0;
    END IF;

    FOR buy_order IN
        SELECT * FROM public.buy_orders
        WHERE status = 'available' AND shares_requested > COALESCE(shares_filled, 0)
        ORDER BY created_at ASC
    LOOP
        FOR sell_order IN
            SELECT * FROM public.sell_orders
            WHERE status = 'available' AND shares_remaining > 0 AND expires_at > NOW()
            ORDER BY created_at ASC
        LOOP
            shares_to_match := LEAST(
                buy_order.shares_requested - COALESCE(buy_order.shares_filled, 0),
                sell_order.shares_remaining
            );

            IF shares_to_match > 0 THEN
                amount_to_match := shares_to_match * share_price;

                INSERT INTO public.matched_orders (buy_order_id, sell_order_id, buyer_uuid, seller_uuid, shares_matched, price_per_share, total_amount)
                VALUES (buy_order.id, sell_order.id, buy_order.user_uuid, sell_order.user_uuid, shares_to_match, share_price, amount_to_match);

                UPDATE public.buy_orders
                SET
                    shares_filled = COALESCE(shares_filled, 0) + shares_to_match,
                    amount_filled = COALESCE(amount_filled, 0) + amount_to_match,
                    status = CASE
                        WHEN COALESCE(shares_filled, 0) + shares_to_match >= shares_requested THEN 'filled'::order_status
                        ELSE 'available'::order_status
                    END
                WHERE id = buy_order.id;

                UPDATE public.sell_orders
                SET
                    shares_remaining = shares_remaining - shares_to_match,
                    status = CASE
                        WHEN shares_remaining - shares_to_match <= 0 THEN 'filled'::order_status
                        ELSE 'available'::order_status
                    END
                WHERE id = sell_order.id;

                INSERT INTO public.user_shares (user_uuid, wallet_type, shares, source)
                VALUES (buy_order.user_uuid, 'hold_pre', shares_to_match, 'purchase')
                ON CONFLICT (user_uuid, wallet_type) DO UPDATE SET shares = user_shares.shares + EXCLUDED.shares;

                INSERT INTO public.user_shares (user_uuid, wallet_type, shares, source)
                VALUES (sell_order.user_uuid, 'cashout_wallet', amount_to_match, 'sale')
                ON CONFLICT (user_uuid, wallet_type) DO UPDATE SET shares = user_shares.shares + EXCLUDED.shares;

                matches_made := matches_made + 1;
            END IF;
            
            EXIT WHEN (SELECT shares_requested - COALESCE(shares_filled, 0) FROM public.buy_orders WHERE id = buy_order.id) <= 0;
        END LOOP;
    END LOOP;

    RETURN matches_made;
END;
$$ LANGUAGE plpgsql;


-- STEP 6: Grant permissions for the new functions.
GRANT EXECUTE ON FUNCTION public.place_sell_order(uuid, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_buy_order(uuid, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_orders() TO postgres;


-- STEP 7: Safely schedule the cron job without deleting.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'match-all-orders-job') THEN
    PERFORM cron.schedule(
      'match-all-orders-job',
      '* * * * *', -- every minute
      $$SELECT public.match_orders()$$
    );
  END IF;
END;
$$;


COMMIT;
