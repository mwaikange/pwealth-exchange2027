-- ✅ 1. Create function to place buy order with delay
CREATE OR REPLACE FUNCTION place_buy_order_with_delay(
    p_user_uuid UUID,
    p_price_per_share NUMERIC,
    p_total_amount NUMERIC,
    p_delay_seconds INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_shares_requested NUMERIC;
BEGIN
    -- Calculate shares requested
    v_shares_requested := FLOOR(p_total_amount / p_price_per_share);
    
    -- Insert buy order
    INSERT INTO buy_orders (
        user_uuid,
        total_amount,
        price_per_share,
        shares_requested,
        amount_filled,
        shares_filled,
        status,
        created_at
    ) VALUES (
        p_user_uuid,
        p_total_amount,
        p_price_per_share,
        v_shares_requested,
        0,
        0,
        'pending'::order_status,
        NOW()
    ) RETURNING id INTO v_order_id;
    
    -- Schedule matching after delay using pg_cron or trigger
    -- For now, we'll use a simple approach with updated_at
    UPDATE buy_orders 
    SET updated_at = NOW() + (p_delay_seconds || ' seconds')::INTERVAL
    WHERE id = v_order_id;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- ✅ 2. Improved order matching with FIFO and proper wallet transfers
CREATE OR REPLACE FUNCTION match_orders()
RETURNS TABLE(
    matched_count INTEGER,
    total_volume NUMERIC
) AS $$
DECLARE
    v_buy_order RECORD;
    v_sell_order RECORD;
    v_match_id UUID;
    v_shares_to_match NUMERIC;
    v_amount_to_match NUMERIC;
    v_matched_count INTEGER := 0;
    v_total_volume NUMERIC := 0;
BEGIN
    -- Process buy orders in FIFO order (oldest first)
    FOR v_buy_order IN 
        SELECT * FROM buy_orders 
        WHERE status IN ('pending', 'partial')
        AND (updated_at IS NULL OR updated_at <= NOW()) -- Only match orders past their delay
        ORDER BY created_at ASC
    LOOP
        -- Find matching sell orders in FIFO order
        FOR v_sell_order IN
            SELECT * FROM sell_orders
            WHERE status IN ('available', 'partial')
            AND shares_remaining > 0
            ORDER BY created_at ASC
        LOOP
            -- Calculate how much can be matched
            v_shares_to_match := LEAST(
                FLOOR((v_buy_order.total_amount - v_buy_order.amount_filled) / v_buy_order.price_per_share),
                v_sell_order.shares_remaining
            );
            
            -- Skip if no shares can be matched
            IF v_shares_to_match <= 0 THEN
                CONTINUE;
            END IF;
            
            v_amount_to_match := v_shares_to_match * v_buy_order.price_per_share;
            
            -- Create matched_orders entry
            INSERT INTO matched_orders (
                buy_order_id,
                sell_order_id,
                buyer_uuid,
                seller_uuid,
                shares_matched,
                price_per_share,
                total_amount,
                matched_at
            ) VALUES (
                v_buy_order.id,
                v_sell_order.id,
                v_buy_order.user_uuid,
                v_sell_order.user_uuid,
                v_shares_to_match,
                v_buy_order.price_per_share,
                v_amount_to_match,
                NOW()
            ) RETURNING id INTO v_match_id;
            
            -- Update buy order
            UPDATE buy_orders SET
                amount_filled = amount_filled + v_amount_to_match,
                shares_filled = shares_filled + v_shares_to_match,
                status = CASE 
                    WHEN amount_filled + v_amount_to_match >= total_amount THEN 'completed'::order_status
                    ELSE 'partial'::order_status
                END,
                updated_at = NOW()
            WHERE id = v_buy_order.id;
            
            -- Update sell order
            UPDATE sell_orders SET
                shares_remaining = shares_remaining - v_shares_to_match,
                status = CASE 
                    WHEN shares_remaining - v_shares_to_match <= 0 THEN 'completed'::order_status
                    ELSE 'partial'::order_status
                END,
                updated_at = NOW()
            WHERE id = v_sell_order.id;
            
            -- ✅ WALLET TRANSFERS
            -- Credit buyer's hold_pre wallet with shares
            UPDATE user_wallets SET
                hold_pre = hold_pre + v_shares_to_match,
                updated_at = NOW()
            WHERE user_uuid = v_buy_order.user_uuid;
            
            -- Credit seller's cashout wallet with money
            UPDATE user_wallets SET
                cashout = cashout + v_amount_to_match,
                updated_at = NOW()
            WHERE user_uuid = v_sell_order.user_uuid;
            
            -- Update counters
            v_matched_count := v_matched_count + 1;
            v_total_volume := v_total_volume + v_amount_to_match;
            
            -- Refresh buy order data for next iteration
            SELECT * INTO v_buy_order FROM buy_orders WHERE id = v_buy_order.id;
            
            -- Exit if buy order is fully filled
            IF v_buy_order.status = 'completed' THEN
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT v_matched_count, v_total_volume;
END;
$$ LANGUAGE plpgsql;

-- ✅ 3. Function to clean up completed orders after display period
CREATE OR REPLACE FUNCTION cleanup_completed_orders()
RETURNS INTEGER AS $$
DECLARE
    v_cleaned_count INTEGER := 0;
BEGIN
    -- Remove completed buy orders older than 2 minutes from market view
    -- (They'll still show in user's personal view)
    UPDATE buy_orders SET
        status = 'archived'::order_status
    WHERE status = 'completed'
    AND updated_at < NOW() - INTERVAL '2 minutes';
    
    GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
    
    -- Remove completed sell orders older than 2 minutes from market view
    UPDATE sell_orders SET
        status = 'archived'::order_status
    WHERE status = 'completed'
    AND updated_at < NOW() - INTERVAL '2 minutes';
    
    GET DIAGNOSTICS v_cleaned_count = v_cleaned_count + ROW_COUNT;
    
    RETURN v_cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- ✅ 4. Add 'archived' status to enum if not exists
DO $$
BEGIN
    BEGIN
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'archived';
    EXCEPTION WHEN duplicate_object THEN
        -- Status already exists
        NULL;
    END;
END $$;

-- ✅ 5. Create cron job for automatic order matching and cleanup
-- This will run every 30 seconds to match orders and clean up completed ones
SELECT cron.schedule(
    'match-orders-and-cleanup',
    '*/30 * * * * *', -- Every 30 seconds
    $$
    SELECT match_orders();
    SELECT cleanup_completed_orders();
    $$
);
