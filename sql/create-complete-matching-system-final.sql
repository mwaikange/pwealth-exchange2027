-- First, create the complete order matching system
CREATE OR REPLACE FUNCTION match_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    buy_rec RECORD;
    sell_rec RECORD;
    matched_shares NUMERIC;
    matched_amount NUMERIC;
    shares_needed NUMERIC;
BEGIN
    RAISE NOTICE '🔄 Starting order matching process...';
    
    -- Loop through all pending buy orders (FIFO - oldest first)
    FOR buy_rec IN
        SELECT * FROM buy_orders 
        WHERE status = 'pending' 
        ORDER BY created_at ASC
    LOOP
        RAISE NOTICE '💰 Processing buy order: % (Amount: %, Price: %)', 
            buy_rec.id, buy_rec.total_amount, buy_rec.price_per_share;
        
        -- Calculate how many shares this buy order still needs
        shares_needed := (buy_rec.total_amount - COALESCE(buy_rec.amount_filled, 0)) / buy_rec.price_per_share;
        
        IF shares_needed <= 0 THEN
            CONTINUE; -- Skip if already filled
        END IF;
        
        -- Loop through available sell orders at matching price
        FOR sell_rec IN
            SELECT * FROM sell_orders 
            WHERE status = 'available' 
            AND price_per_share = buy_rec.price_per_share
            AND shares_remaining > 0
            ORDER BY created_at ASC
        LOOP
            RAISE NOTICE '📈 Found matching sell order: % (Shares: %, Price: %)', 
                sell_rec.id, sell_rec.shares_remaining, sell_rec.price_per_share;
            
            -- Calculate how much can be matched
            matched_shares := LEAST(shares_needed, sell_rec.shares_remaining);
            matched_amount := matched_shares * sell_rec.price_per_share;
            
            RAISE NOTICE '🤝 Matching % shares for N$%', matched_shares, matched_amount;
            
            -- Update buy order
            UPDATE buy_orders 
            SET amount_filled = COALESCE(amount_filled, 0) + matched_amount,
                status = CASE 
                    WHEN COALESCE(amount_filled, 0) + matched_amount >= total_amount THEN 'completed'
                    ELSE 'partial'
                END,
                updated_at = NOW()
            WHERE id = buy_rec.id;
            
            -- Update sell order
            UPDATE sell_orders 
            SET shares_remaining = shares_remaining - matched_shares,
                status = CASE 
                    WHEN shares_remaining - matched_shares <= 0 THEN 'completed'
                    ELSE 'partial'
                END,
                updated_at = NOW()
            WHERE id = sell_rec.id;
            
            -- Transfer shares to buyer (hold_pre wallet)
            INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
            VALUES (buy_rec.user_uuid, 'hold_pre', matched_shares, NOW(), NOW())
            ON CONFLICT (user_uuid, wallet_type) 
            DO UPDATE SET 
                shares = user_shares.shares + matched_shares,
                updated_at = NOW();
            
            -- Transfer money to seller (cashout_wallet)
            INSERT INTO user_shares (user_uuid, wallet_type, shares, created_at, updated_at)
            VALUES (sell_rec.user_uuid, 'cashout_wallet', matched_amount, NOW(), NOW())
            ON CONFLICT (user_uuid, wallet_type) 
            DO UPDATE SET 
                shares = user_shares.shares + matched_amount,
                updated_at = NOW();
            
            -- Log the transaction
            INSERT INTO transactions (
                type, buyer_uuid, seller_uuid, amount_nad, shares, 
                status, created_at, updated_at
            ) VALUES (
                'exchange_match', buy_rec.user_uuid, sell_rec.user_uuid,
                matched_amount, matched_shares, 'completed', NOW(), NOW()
            );
            
            RAISE NOTICE '✅ Match completed: % shares transferred, N$% paid', matched_shares, matched_amount;
            
            -- Update shares needed for next iteration
            shares_needed := shares_needed - matched_shares;
            
            -- Exit if buy order is fully filled
            IF shares_needed <= 0 THEN
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '🏁 Order matching process completed';
END;
$$;

-- Test function to manually trigger matching
CREATE OR REPLACE FUNCTION test_match_orders()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM match_orders();
    RETURN 'Order matching completed. Check logs for details.';
END;
$$;

-- Debug function to see current orders
CREATE OR REPLACE FUNCTION debug_orders()
RETURNS TABLE(
    order_type TEXT,
    order_id UUID,
    user_uuid UUID,
    amount_or_shares NUMERIC,
    price_per_share NUMERIC,
    status TEXT,
    created_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'BUY'::TEXT,
        b.id,
        b.user_uuid,
        b.total_amount,
        b.price_per_share,
        b.status,
        b.created_at
    FROM buy_orders b
    WHERE b.status IN ('pending', 'partial')
    
    UNION ALL
    
    SELECT 
        'SELL'::TEXT,
        s.id,
        s.user_uuid,
        s.shares_remaining,
        s.price_per_share,
        s.status,
        s.created_at
    FROM sell_orders s
    WHERE s.status IN ('available', 'partial');
END;
$$;
