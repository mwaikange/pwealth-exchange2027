-- =================================================================
-- FINAL FIX FOR: `permission denied for table users`
-- This script addresses the root cause by fixing both RLS policies
-- and function security definitions.
-- =================================================================

BEGIN;

-- STEP 1: Grant SELECT on auth.users to the authenticated role.
-- This ensures logged-in users have the base permission to read user data.
GRANT SELECT ON TABLE auth.users TO authenticated;
GRANT SELECT ON TABLE auth.users TO authenticator; -- Also grant to authenticator for RPC calls

-- STEP 2: Create a definitive RLS policy on `auth.users`.
-- This is the most critical step. It allows any authenticated user to
-- read from the auth.users table, which is required by the functions.
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Drop any previous, potentially incorrect policies.
DROP POLICY IF EXISTS "Allow authenticator to select users" ON auth.users;
DROP POLICY IF EXISTS "Allow authenticated users to read user data" ON auth.users;

-- Create the new, correct policy.
CREATE POLICY "Allow authenticated users to read user data"
ON auth.users
FOR SELECT
TO authenticated
USING (true); -- Allows any logged-in user to read any row.

-- STEP 3: Recreate functions with `SECURITY DEFINER`.
-- This makes the functions run with the permissions of the function owner (postgres),
-- bypassing the calling user's RLS restrictions for the duration of the function.

-- Recreate place_buy_order_with_delay
CREATE OR REPLACE FUNCTION public.place_buy_order_with_delay(
    p_user_uuid uuid,
    p_total_amount numeric,
    p_price_per_share numeric,
    p_delay_seconds integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- <<< CRITICAL FIX
AS $$
DECLARE
    v_buy_wallet_balance numeric;
    v_shares_to_purchase numeric;
    v_new_order_id uuid;
    v_buy_ref text;
BEGIN
    -- Check user's buy wallet balance
    SELECT pwt_invest_balance INTO v_buy_wallet_balance FROM public.user_shares WHERE user_uuid = p_user_uuid;

    IF v_buy_wallet_balance IS NULL OR v_buy_wallet_balance < p_total_amount THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient Buy-wallet funds.');
    END IF;

    -- Deduct amount from buy wallet immediately
    UPDATE public.user_shares
    SET pwt_invest_balance = pwt_invest_balance - p_total_amount
    WHERE user_uuid = p_user_uuid;

    -- Calculate shares to purchase
    v_shares_to_purchase := p_total_amount / p_price_per_share;
    v_buy_ref := 'BUY-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

    -- Insert the buy order
    INSERT INTO public.buy_orders (user_uuid, shares_requested, price_per_share, total_amount, status, buy_ref, execution_time)
    VALUES (p_user_uuid, v_shares_to_purchase, p_price_per_share, p_total_amount, 'pending', v_buy_ref, now() + (p_delay_seconds || ' seconds')::interval)
    RETURNING id INTO v_new_order_id;

    RETURN json_build_object('success', true, 'message', 'Buy order placed successfully.', 'order_id', v_new_order_id);

EXCEPTION
    WHEN others THEN
        RETURN json_build_object('success', false, 'message', 'Error processing buy order: ' || SQLERRM);
END;
$$;

-- Recreate place_sell_order
CREATE OR REPLACE FUNCTION public.place_sell_order(
    p_user_uuid uuid,
    p_shares numeric,
    p_price_per_share numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- <<< CRITICAL FIX
AS $$
DECLARE
    v_hold_wallet_balance numeric;
    v_new_order_id uuid;
    v_sell_ref text;
BEGIN
    -- Check user's post-hold wallet balance
    SELECT pwt_hold_balance_post_hold INTO v_hold_wallet_balance FROM public.user_shares WHERE user_uuid = p_user_uuid;

    IF v_hold_wallet_balance IS NULL OR v_hold_wallet_balance < p_shares THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient Post-hold shares.');
    END IF;

    -- Deduct shares from post-hold wallet immediately
    UPDATE public.user_shares
    SET pwt_hold_balance_post_hold = pwt_hold_balance_post_hold - p_shares
    WHERE user_uuid = p_user_uuid;

    v_sell_ref := 'SELL-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

    -- Insert the sell order
    INSERT INTO public.sell_orders (user_uuid, shares_available, shares_remaining, price_per_share, status, sell_ref)
    VALUES (p_user_uuid, p_shares, p_shares, p_price_per_share, 'pending', v_sell_ref)
    RETURNING id INTO v_new_order_id;

    RETURN json_build_object('success', true, 'message', 'Sell order placed successfully.', 'order_id', v_new_order_id);

EXCEPTION
    WHEN others THEN
        RETURN json_build_object('success', false, 'message', 'Error processing sell order: ' || SQLERRM);
END;
$$;


-- STEP 4: Grant EXECUTE permission on the functions to the authenticated role.
GRANT EXECUTE ON FUNCTION public.place_buy_order_with_delay(uuid, numeric, numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_sell_order(uuid, numeric, numeric) TO authenticated;

COMMIT;
