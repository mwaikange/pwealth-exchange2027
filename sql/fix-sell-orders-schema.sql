-- First, let's see what the actual sell_orders table looks like
-- and fix the function to match the correct schema

-- Check current sell_orders table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sell_orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current buy_orders table structure for comparison
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'buy_orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Fix the place_sell_order function to use correct column names
CREATE OR REPLACE FUNCTION place_sell_order(
    p_price_per_share NUMERIC,
    p_shares NUMERIC,
    p_user_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    user_shares_balance NUMERIC;
    sell_order_id UUID;
    total_amount NUMERIC;
    expires_at TIMESTAMPTZ;
BEGIN
    -- Calculate total amount
    total_amount := p_shares * p_price_per_share;
    
    -- Validate minimum
    IF p_shares < 0.5 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum sell is 0.5 shares'
        );
    END IF;
    
    IF total_amount < 50 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Minimum sell order value is N$50'
        );
    END IF;
    
    -- Check user balance in hold_post
    SELECT COALESCE(shares, 0) FROM user_shares 
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post'
    INTO user_shares_balance;
    
    IF user_shares_balance < p_shares THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient shares in Post-Hold Wallet'
        );
    END IF;
    
    -- IMPORTANT: Lock shares by deducting from hold_post
    UPDATE user_shares 
    SET shares = shares - p_shares,
        updated_at = NOW()
    WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';
    
    -- Verify the update worked
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to lock shares - wallet not found'
        );
    END IF;
    
    -- Calculate expiry (Sunday 23:59 of current week)
    expires_at := DATE_TRUNC('week', NOW()) + INTERVAL '6 days' + INTERVAL '23 hours 59 minutes';
    
    -- Create sell order using CORRECT column names that match the actual table
    INSERT INTO sell_orders (
        user_uuid, 
        shares_available,     -- Instead of 'shares'
        shares_remaining,     -- Track remaining shares
        price_per_share, 
        total_amount,         -- Add total amount
        status,
        expires_at
    ) VALUES (
        p_user_uuid, 
        p_shares,            -- shares_available
        p_shares,            -- shares_remaining (initially same as available)
        p_price_per_share,
        total_amount,
        'available',         -- Use 'available' status to match the view
        expires_at
    ) RETURNING id INTO sell_order_id;
    
    -- Log the transaction
    INSERT INTO share_transactions (
        user_uuid, transaction_type, shares, price_per_share, total_amount,
        from_wallet, status, description, reference_id
    ) VALUES (
        p_user_uuid, 'sell', p_shares, p_price_per_share, total_amount,
        'hold_post', 'pending', 'Sell order placed - shares locked', 
        'SELL-' || sell_order_id
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Sell order listed for ' || p_shares || ' shares at N$' || p_price_per_share,
        'order_id', sell_order_id,
        'shares_listed', p_shares,
        'status', 'available',
        'total_amount', total_amount,
        'expires_at', expires_at
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback: return shares to post-hold wallet
        UPDATE user_shares 
        SET shares = shares + p_shares
        WHERE user_uuid = p_user_uuid AND wallet_type = 'hold_post';
        
        RETURN json_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
