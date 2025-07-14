-- =================================================================
-- FIX for Order Reference Format
-- This script implements the correct, simple order reference format
-- as requested: `Buy_123456` and `Sell_123456`.
--
-- It will:
-- 1. Drop the incorrect complex reference generator.
-- 2. Create a new simple reference generator.
-- 3. Update the main order placement functions to use it.
-- =================================================================

BEGIN;

-- STEP 1: Drop the incorrect complex reference generator function.
DROP FUNCTION IF EXISTS public.generate_order_reference(TEXT);

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


-- STEP 3: Update the `place_sell_order` function to use the new reference format.
CREATE OR REPLACE FUNCTION public.place_sell_order(p_user_uuid uuid, p_price_per_share numeric, p_shares numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_price NUMERIC;
    total_amount NUMERIC;
    user_post_hold_balance NUMERIC;
    sell_order_id UUID;
    expires_at TIMESTAMPTZ;
    v_sell_ref TEXT; -- Variable for the new reference
BEGIN
    -- Use the provided price or get current price
    current_price := COALESCE(p_price_per_share, get_current_share_price());
    total_amount := p_shares * current_price;

    -- Validate minimum amount
    IF total_amount < 50 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum sell order value is N$50',
            'error_code', 'MIN_AMOUNT'
        );
    END IF;

    -- Check user's post-hold balance
    SELECT COALESCE(shares, 0) INTO user_post_hold_balance
    FROM public.user_shares
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';

    IF user_post_hold_balance < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient shares in Post-Hold wallet',
            'error_code', 'INSUFFICIENT_SHARES'
        );
    END IF;

    -- Lock shares by deducting from post-hold wallet
    UPDATE public.user_shares
    SET shares = shares - p_shares,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';

    -- Generate the simple sell reference using the new function
    v_sell_ref := public.generate_simple_order_ref('Sell');

    -- Calculate expiry (Sunday 23:59 of current week)
    expires_at := DATE_TRUNC('week', NOW()) + INTERVAL '6 days' + INTERVAL '23 hours 59 minutes';

    -- Create sell order with the new sell_ref
    INSERT INTO public.sell_orders (
        user_uuid, shares_available, shares_remaining, total_amount,
        price_per_share, status, expires_at, sell_ref
    ) VALUES (
        p_user_uuid, p_shares, p_shares, total_amount,
        current_price, 'available', expires_at, v_sell_ref
    ) RETURNING id INTO sell_order_id;

    -- Log transaction
    INSERT INTO public.share_transactions (
        user_uuid, transaction_type, shares, price_per_share, total_amount,
        from_wallet, status, description, reference_id
    ) VALUES (
        p_user_uuid, 'sell', p_shares, current_price, total_amount,
        'hold_post', 'pending', 'Sell order placed - shares locked',
        v_sell_ref -- Use the new reference here as well
    );

    RETURN json_build_object(
        'success', true,
        'message', format('Sell order placed: %s shares at N$%s each. Ref: %s',
            p_shares, current_price, v_sell_ref),
        'order_id', sell_order_id,
        'sell_ref', v_sell_ref
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Rollback: return shares to post-hold wallet
        UPDATE public.user_shares
        SET shares = shares + p_shares
        WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';

        RETURN json_build_object(
            'success', false,
            'message', 'Error processing sell order: ' || SQLERRM,
            'error_code', 'PROCESSING_ERROR'
        );
END;
$function$;


-- STEP 4: Update the `place_buy_order_with_delay` function to use the new reference format.
CREATE OR REPLACE FUNCTION public.place_buy_order_with_delay(p_user_uuid uuid, p_price_per_share numeric, p_total_amount numeric, p_delay_seconds integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_price NUMERIC;
    shares_to_buy NUMERIC;
    user_buy_balance NUMERIC;
    v_buy_ref TEXT; -- Variable for the new reference
    job_id BIGINT;
BEGIN
    -- Validate minimum amount
    IF p_total_amount < 50 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum buy order is N$50',
            'error_code', 'MIN_AMOUNT'
        );
    END IF;

    -- Use provided price or get current price
    current_price := COALESCE(p_price_per_share, get_current_share_price());
    shares_to_buy := floor(p_total_amount / current_price);

    IF shares_to_buy = 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Amount too small to buy any shares at the current price.',
            'error_code', 'INSUFFICIENT_AMOUNT'
        );
    END IF;

    -- Check user's buy wallet balance
    SELECT COALESCE(shares, 0) INTO user_buy_balance
    FROM public.user_shares
    WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

    IF user_buy_balance < p_total_amount THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient funds in Buy Wallet.',
            'error_code', 'INSUFFICIENT_FUNDS'
        );
    END IF;

    -- Immediately deduct funds from buy wallet to lock them
    UPDATE public.user_shares
    SET shares = shares - p_total_amount
    WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

    -- Generate the simple buy reference using the new function
    v_buy_ref := public.generate_simple_order_ref('Buy');

    -- Create the buy order with 'pending' status and the new buy_ref
    INSERT INTO public.buy_orders (
        user_uuid, shares_requested, total_amount, price_per_share, status, buy_ref
    ) VALUES (
        p_user_uuid, shares_to_buy, p_total_amount, current_price, 'pending', v_buy_ref
    );

    -- Schedule the matching job
    SELECT cron.schedule(
        'match-order-' || v_buy_ref,
        (NOW() + (p_delay_seconds || ' seconds')::interval)::text,
        $$ SELECT public.match_orders() $$
    ) INTO job_id;

    RETURN json_build_object(
        'success', true,
        'message', format('Buy order for N$%s placed successfully. Ref: %s. Matching will occur shortly.',
            p_total_amount, v_buy_ref),
        'buy_ref', v_buy_ref,
        'job_id', job_id
    );

EXCEPTION
    WHEN OTHERS THEN
        -- If anything fails, refund the user's money
        UPDATE public.user_shares
        SET shares = shares + p_total_amount
        WHERE user_uuid = p_user_uuid AND wallet_type = 'buy_wallet';

        RETURN json_build_object(
            'success', false,
            'message', 'Error processing buy order: ' || SQLERRM,
            'error_code', 'PROCESSING_ERROR'
        );
END;
$function$;


-- STEP 5: Grant execute permissions on the updated functions to ensure they are callable.
GRANT EXECUTE ON FUNCTION public.place_buy_order_with_delay(uuid, numeric, numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_sell_order(uuid, numeric, numeric) TO authenticated;

COMMIT;
