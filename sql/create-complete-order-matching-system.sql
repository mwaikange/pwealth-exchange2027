-- Complete order matching system with proper wallet transfers
CREATE OR REPLACE FUNCTION match_orders()
RETURNS JSON AS $$
DECLARE
    buy_rec RECORD;
    sell_rec RECORD;
    matched_shares NUMERIC;
    matched_amount NUMERIC;
    total_matches INTEGER := 0;
    remaining_buy_amount NUMERIC;
    remaining_sell_shares NUMERIC;
BEGIN
    RAISE NOTICE 'Starting order matching process...';
    
    -- Loop through pending buy orders (FIFO - oldest first)
    FOR buy_rec IN
        SELECT * FROM buy_orders 
        WHERE status = 'pending' 
        ORDER BY created_at ASC
    LOOP
        RAISE NOTICE 'Processing buy order: % for N$% at N$% per share', 
            buy_rec.id, buy_rec.total_amount, buy_rec.price_per_share;
        
        -- Calculate remaining amount to fill
        remaining_buy_amount := buy_rec.total_amount - COALESCE(buy_rec.amount_filled, 0);
        
        -- Skip if buy order is already fully filled
        IF remaining_buy_amount <= 0 THEN
            CONTINUE;
        END IF;
        
        -- Loop through available sell orders at matching price (FIFO - oldest first)
        FOR sell_rec IN
            SELECT * FROM sell_orders 
            WHERE status = 'available' 
            AND price_per_share = buy_rec.price_per_share
            AND shares_remaining > 0
            ORDER BY created_at ASC
        LOOP
            RAISE NOTICE 'Found matching sell order: % with % shares at N$% per share', 
                sell_rec.id, sell_rec.shares_remaining, sell_rec.price_per_share;
            
            -- Calculate how much can be matched
            remaining_sell_shares := sell_rec.shares_remaining;
            
            -- Maximum shares we can buy with remaining amount
            matched_shares := LEAST(
                remaining_sell_shares,
                FLOOR(remaining_buy_amount / buy_rec.price_per_share * 100) / 100  -- Round to 2 decimals
            );
            
            -- Skip if no shares to match
            IF matched_shares <= 0 THEN
                CONTINUE;
            END IF;
            
            matched_amount := matched_shares * buy_rec.price_per_share;
            
            RAISE NOTICE 'Matching % shares for N$%', matched_shares, matched_amount;
            
            -- 1. Transfer shares to buyer (hold_pre wallet)
            INSERT INTO user_shares (user_uuid, wallet_type, shares, source, updated_at)
            VALUES (buy_rec.user_uuid, 'hold_pre', matched_shares, 'purchase', NOW())
            ON CONFLICT (user_uuid, wallet_type)
            DO UPDATE SET 
                shares = user_shares.shares + EXCLUDED.shares,
                updated_at = NOW();
            
            -- 2. Transfer money to seller (cashout_wallet)
            INSERT INTO user_shares (user_uuid, wallet_type, shares, source, updated_at)
            VALUES (sell_rec.user_uuid, 'cashout_wallet', matched_amount, 'sale', NOW())
            ON CONFLICT (user_uuid, wallet_type)
            DO UPDATE SET 
                shares = user_shares.shares + EXCLUDED.shares,
                updated_at = NOW();
            
            -- 3. Update sell order
            UPDATE sell_orders
            SET 
                shares_remaining = shares_remaining - matched_shares,
                status = CASE 
                    WHEN shares_remaining - matched_shares <= 0 THEN 'matched'
                    ELSE 'available'
                END,
                updated_at = NOW()
            WHERE id = sell_rec.id;
            
            -- 4. Update buy order
            UPDATE buy_orders
            SET 
                amount_filled = COALESCE(amount_filled, 0) + matched_amount,
                shares_fulfilled = COALESCE(shares_fulfilled, 0) + matched_shares,
                status = CASE 
                    WHEN COALESCE(amount_filled, 0) + matched_amount >= total_amount THEN 'completed'
                    ELSE 'pending'
                END,
                updated_at = NOW()
            WHERE id = buy_rec.id;
            
            -- 5. Log the transaction
            INSERT INTO share_transactions (
                user_uuid, transaction_type, shares, price_per_share, total_amount,
                to_wallet, status, description, reference_id, created_at
            ) VALUES 
            (buy_rec.user_uuid, 'buy', matched_shares, buy_rec.price_per_share, matched_amount,
             'hold_pre', 'completed', 'Share purchase - matched order', 'MATCH-' || buy_rec.id, NOW()),
            (sell_rec.user_uuid, 'sell', matched_shares, sell_rec.price_per_share, matched_amount,
             'cashout_wallet', 'completed', 'Share sale - matched order', 'MATCH-' || sell_rec.id, NOW());
            
            total_matches := total_matches + 1;
            
            -- Update remaining amount for next iteration
            remaining_buy_amount := remaining_buy_amount - matched_amount;
            
            RAISE NOTICE 'Match completed. Remaining buy amount: N$%', remaining_buy_amount;
            
            -- Exit if buy order is fully filled
            IF remaining_buy_amount <= 0 THEN
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Order matching completed. Total matches: %', total_matches;
    
    RETURN json_build_object(
        'success', true,
        'matches_made', total_matches,
        'message', format('Order matching completed: %s matches made', total_matches)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in order matching: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'message', 'Error in order matching: ' || SQLERRM,
            'error_code', 'MATCHING_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test function to manually trigger matching
CREATE OR REPLACE FUNCTION test_match_orders()
RETURNS JSON AS $$
BEGIN
    RETURN match_orders();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
