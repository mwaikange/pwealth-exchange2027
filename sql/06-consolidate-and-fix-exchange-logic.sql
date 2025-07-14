-- =================================================================
-- CONSOLIDATED EXCHANGE LOGIC FIX
-- This script resolves function ambiguity and cron scheduling errors.
--
-- It will:
-- 1. DROP all four conflicting versions of buy/sell order functions.
-- 2. CREATE one, definitive `place_sell_order` function.
-- 3. CREATE one, definitive `place_buy_order` function (no longer schedules jobs).
-- 4. CREATE a new `match_orders` function to handle all matching logic.
-- 5. CREATE a single, recurring cron job to run `match_orders` every minute.
-- =================================================================

BEGIN;

-- STEP 1: Clean up all old and conflicting functions to resolve ambiguity.
DROP FUNCTION IF EXISTS public.place_sell_order(p_price_per_share numeric, p_shares numeric, p_user_uuid uuid);
DROP FUNCTION IF EXISTS public.place_sell_order(p_user_uuid uuid, p_price_per_share numeric, p_shares numeric);
DROP FUNCTION IF EXISTS public.place_buy_order(p_user_uuid uuid, p_total_amount numeric);
DROP FUNCTION IF EXISTS public.place_buy_order_with_delay(uuid, numeric, numeric, integer);

-- Also drop the old simple reference generator if it exists, to be safe.
DROP FUNCTION IF EXISTS public.generate_simple_order_ref(text);

-- STEP 2: Create the new, correct helper function for simple references.
CREATE OR REPLACE FUNCTION public.generate_simple_order_ref(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    v_random_digits TEXT;
BEGIN
    -- Generate a 6-digit number, padded with leading zeros if necessary.
    v_random_digits := LPAD(floor(random() * 1000000)::int::text, 6, '0');
    -- Combine prefix and digits, e.g., "Sell_123456"
    RETURN p_prefix || '_' || v_random_digits;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Grant permission for authenticated users to use this new helper function.
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

    INSERT INTO public.share_transactions (user_uuid, transaction_type, shares, price_per_share, total_amount, from_wallet, status, description, reference_id)
    VALUES (p_user_uuid, 'sell', p_shares, p_price_per_share, total_amount, 'hold_post', 'pending', 'Sell order placed - shares locked', v_sell_ref);

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
RETURNS void AS $$
DECLARE
    buy_order RECORD;
    sell_order RECORD;
    shares_to_match NUMERIC;
    amount_to_match NUMERIC;
BEGIN
    -- Loop through all available buy orders, oldest first
    FOR buy_order IN
        SELECT * FROM public.buy_orders
        WHERE status = 'available' AND shares_requested > shares_filled
        ORDER BY created_at ASC
    LOOP
        -- For each buy order, find available sell orders
        FOR sell_order IN
            SELECT * FROM public.sell_orders
            WHERE status = 'available' AND shares_remaining > 0 AND expires_at > NOW()
            AND price_per_share <= buy_order.price_per_share -- Match if sell price is good enough
            ORDER BY price_per_share ASC, created_at ASC -- Best price first, then oldest
        LOOP
            shares_to_match := LEAST(buy_order.shares_requested - buy_order.shares_filled, sell_order.shares_remaining);

            IF shares_to_match <= 0 THEN
                CONTINUE; -- Go to next sell order
            END IF;

            amount_to_match := shares_to_match * sell_order.price_per_share;

            -- Create matched order record
            INSERT INTO public.matched_orders (buy_order_id, sell_order_id, buyer_uuid, seller_uuid, shares_matched, price_per_share, total_amount)
            VALUES (buy_order.id, sell_order.id, buy_order.user_uuid, sell_order.user_uuid, shares_to_match, sell_order.price_per_share, amount_to_match);

            -- Update buy order
            UPDATE public.buy_orders SET shares_filled = shares_filled + shares_to_match WHERE id = buy_order.id;
            -- Update sell order
            UPDATE public.sell_orders SET shares_remaining = shares_remaining - shares_to_match WHERE id = sell_order.id;

            -- Transfer shares to buyer's pre-hold wallet
            INSERT INTO public.user_shares (user_uuid, wallet_type, shares, source)
            VALUES (buy_order.user_uuid, 'hold_pre', shares_to_match, 'purchase')
            ON CONFLICT (user_uuid, wallet_type) DO UPDATE SET shares = user_shares.shares + EXCLUDED.shares;

            -- Transfer funds to seller's cashout wallet
            INSERT INTO public.user_shares (user_uuid, wallet_type, shares, source)
            VALUES (sell_order.user_uuid, 'cashout_wallet', amount_to_match, 'sale')
            ON CONFLICT (user_uuid, wallet_type) DO UPDATE SET shares = user_shares.shares + EXCLUDED.shares;
            
            -- If buy order is not fully filled, it will continue in the outer loop
            EXIT WHEN (SELECT shares_requested - shares_filled FROM public.buy_orders WHERE id = buy_order.id) <= 0;
        END LOOP;

        -- After trying all sell orders, update the buy order's status
        UPDATE public.buy_orders
        SET status = CASE WHEN shares_filled >= shares_requested THEN 'filled' ELSE 'available' END
        WHERE id = buy_order.id;
    END LOOP;

    -- Update status for all sell orders that were touched
    UPDATE public.sell_orders
    SET status = CASE WHEN shares_remaining <= 0 THEN 'filled' ELSE 'available' END
    WHERE shares_remaining < shares_available;
END;
$$ LANGUAGE plpgsql;


-- STEP 6: Grant permissions for the new functions.
GRANT EXECUTE ON FUNCTION public.place_sell_order(uuid, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_buy_order(uuid, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_orders() TO postgres; -- Only cron (as postgres) needs to run this.


-- STEP 7: Set up the single, recurring cron job to run every minute.
-- First, delete any old dynamic jobs that might be stuck.
DELETE FROM cron.job WHERE jobname LIKE 'match-order-%';
-- Then, schedule the main job.
SELECT cron.schedule(
    'match-all-orders-job', -- job name
    '* * * * *',            -- every minute
    $$SELECT public.match_orders()$$
);

COMMIT;
