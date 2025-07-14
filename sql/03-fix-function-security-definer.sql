-- =================================================================
-- DEFINITIVE FIX for `permission denied for table users`
-- This script follows the correct Supabase pattern:
-- 1. Grants SELECT on auth.users.
-- 2. Does NOT attempt to modify RLS policies on auth.users.
-- 3. Defines the functions with SECURITY DEFINER so they can
--    execute the check against auth.users successfully.
-- =================================================================

BEGIN;

-- STEP 1: Grant SELECT on auth.users to the necessary roles.
-- This is safe and allowed by Supabase.
GRANT SELECT ON TABLE auth.users TO authenticated;
GRANT SELECT ON TABLE auth.users TO authenticator;

-- STEP 2: Recreate functions with `SECURITY DEFINER`.
-- This makes the functions run with the permissions of the function owner (postgres),
-- which has the necessary access to check auth.users.

-- Recreate place_buy_order_with_delay
CREATE OR REPLACE FUNCTION public.place_buy_order_with_delay(
    p_user_uuid uuid,
    p_price_per_share numeric,
    p_total_amount numeric,
    p_delay_seconds integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- <<< This is the key fix
AS $$
DECLARE
    v_buy_order_id UUID;
    v_shares_requested NUMERIC;
    v_current_buy_wallet_balance NUMERIC;
    v_buy_ref TEXT;
BEGIN
    -- This check will now succeed because of SECURITY DEFINER
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_uuid) THEN
        RETURN json_build_object('success', FALSE, 'message', 'User not found.');
    END IF;

    -- Get current buy_wallet balance from user_shares
    SELECT shares INTO v_current_buy_wallet_balance
    FROM public.user_shares
    WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

    IF v_current_buy_wallet_balance IS NULL OR v_current_buy_wallet_balance < p_total_amount THEN
        RETURN json_build_object('success', FALSE, 'message', 'Insufficient funds in buy wallet.');
    END IF;

    IF p_price_per_share <= 0 THEN
        RETURN json_build_object('success', FALSE, 'message', 'Price per share must be positive.');
    END IF;
    v_shares_requested := p_total_amount / p_price_per_share;

    v_buy_ref := generate_order_reference('Buy');

    UPDATE public.user_shares
    SET shares = shares - p_total_amount, updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

    INSERT INTO public.buy_orders (user_uuid, total_amount, price_per_share, status, shares_requested, buy_ref)
    VALUES (p_user_uuid, p_total_amount, p_price_per_share, 'pending'::order_status, v_shares_requested, v_buy_ref)
    RETURNING id INTO v_buy_order_id;

    IF p_delay_seconds > 0 THEN
        PERFORM pg_cron.schedule(
            'match_buy_order_' || v_buy_order_id,
            '@after ' || p_delay_seconds || ' seconds',
            'SELECT match_specific_buy_order(''' || v_buy_order_id || '''::UUID);'
        );
    ELSE
        PERFORM match_specific_buy_order(v_buy_order_id);
    END IF;

    RETURN json_build_object('success', TRUE, 'message', 'Buy order placed successfully.', 'order_id', v_buy_order_id);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', FALSE, 'message', 'Error processing buy order: ' || SQLERRM);
END;
$$;

-- Recreate place_sell_order
CREATE OR REPLACE FUNCTION public.place_sell_order(
    p_price_per_share numeric,
    p_shares numeric,
    p_user_uuid uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- <<< This is the key fix
AS $$
DECLARE
    v_sell_order_id UUID;
    v_current_hold_post_balance NUMERIC;
    v_sell_ref TEXT;
BEGIN
    -- This check will now succeed because of SECURITY DEFINER
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_uuid) THEN
        RETURN json_build_object('success', FALSE, 'message', 'User not found.');
    END IF;

    -- Get current hold_wallet_post_hold balance
    SELECT shares INTO v_current_hold_post_balance
    FROM public.user_shares
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_post_hold';

    IF v_current_hold_post_balance IS NULL OR v_current_hold_post_balance < p_shares THEN
        RETURN json_build_object('success', FALSE, 'message', 'Insufficient shares in Post-Hold wallet.');
    END IF;

    v_sell_ref := generate_order_reference('Sell');

    UPDATE public.user_shares
    SET shares = shares - p_shares, updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_wallet_post_hold';

    INSERT INTO public.sell_orders (user_uuid, shares_available, shares_remaining, price_per_share, status, sell_ref)
    VALUES (p_user_uuid, p_shares, p_shares, p_price_per_share, 'pending'::order_status, v_sell_ref)
    RETURNING id INTO v_sell_order_id;

    RETURN json_build_object('success', TRUE, 'message', 'Sell order placed successfully.', 'order_id', v_sell_order_id);

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', FALSE, 'message', 'Error processing sell order: ' || SQLERRM);
END;
$$;

-- STEP 3: Grant EXECUTE permission on the functions to the authenticated role.
-- This allows logged-in users to call these functions.
GRANT EXECUTE ON FUNCTION public.place_buy_order_with_delay(uuid, numeric, numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_sell_order(numeric, numeric, uuid) TO authenticated;

COMMIT;
