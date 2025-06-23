-- Create the automatic order matching system
CREATE OR REPLACE FUNCTION match_orders()
RETURNS JSON AS $$
DECLARE
    buy_rec RECORD;
    sell_rec RECORD;
    matched_shares NUMERIC;
    matched_amount NUMERIC;
    total_matches INTEGER := 0;
    current_price NUMERIC;
BEGIN
    -- Get current share price
    current_price := get_current_share_price();
    
    -- Loop through pending buy orders
    FOR buy_rec IN
        SELECT * FROM buy_orders 
        WHERE status = 'pending' 
        AND shares_fulfilled < shares_requested
        ORDER BY created_at ASC
    LOOP
        -- Loop through available sell orders at the same price
        FOR sell_rec IN
            SELECT * FROM sell_orders 
            WHERE status = 'available' 
            AND price_per_share = buy_rec.price_per_share
            AND shares_remaining > 0
            ORDER BY created_at ASC
        LOOP
            -- Calculate how many shares can be matched
            matched_shares := LEAST(
                sell_rec.shares_remaining,
                buy_rec.shares_requested - COALESCE(buy_rec.shares_fulfilled, 0)
            );
            
            -- Skip if no shares to match
            IF matched_shares <= 0 THEN
                CONTINUE;
            END IF;
            
            matched_amount := matched_shares * buy_rec.price_per_share;
            
            -- Transfer shares to buyer (hold_pre wallet)
            INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
            VALUES (buy_rec.user_uuid, 'hold_pre', matched_shares, 'purchase')
            ON CONFLICT (user_uuid, wallet_type)
            DO UPDATE SET 
                shares = user_shares.shares + EXCLUDED.shares,
                updated_at = NOW();
            
            -- Transfer money to seller (cashout_wallet)
            INSERT INTO user_shares (user_uuid, wallet_type, shares, source)
            VALUES (sell_rec.user_uuid, 'cashout_wallet', matched_amount, 'sale')
            ON CONFLICT (user_uuid, wallet_type)
            DO UPDATE SET 
                shares = user_shares.shares + EXCLUDED.shares,
                updated_at = NOW();
            
            -- Update sell order
            UPDATE sell_orders
            SET 
                shares_remaining = shares_remaining - matched_shares,
                status = CASE 
                    WHEN shares_remaining - matched_shares <= 0 THEN 'matched'
                    ELSE 'available'
                END,
                updated_at = NOW()
            WHERE id = sell_rec.id;
            
            -- Update buy order
            UPDATE buy_orders
            SET 
                shares_fulfilled = COALESCE(shares_fulfilled, 0) + matched_shares,
                amount_filled = COALESCE(amount_filled, 0) + matched_amount,
                status = CASE 
                    WHEN COALESCE(shares_fulfilled, 0) + matched_shares >= shares_requested THEN 'completed'
                    ELSE 'pending'
                END,
                updated_at = NOW()
            WHERE id = buy_rec.id;
            
            -- Log the transaction
            INSERT INTO share_transactions (
                user_uuid, transaction_type, shares, price_per_share, total_amount,
                to_wallet, status, description, reference_id
            ) VALUES 
            (buy_rec.user_uuid, 'buy', matched_shares, buy_rec.price_per_share, matched_amount,
             'hold_pre', 'completed', 'Share purchase - matched order', 'MATCH-' || buy_rec.id),
            (sell_rec.user_uuid, 'sell', matched_shares, sell_rec.price_per_share, matched_amount,
             'cashout_wallet', 'completed', 'Share sale - matched order', 'MATCH-' || sell_rec.id);
            
            total_matches := total_matches + 1;
            
            -- Refresh the records for next iteration
            SELECT * INTO buy_rec FROM buy_orders WHERE id = buy_rec.id;
            SELECT * INTO sell_rec FROM sell_orders WHERE id = sell_rec.id;
            
            -- Exit if buy order is fully filled
            IF buy_rec.status = 'completed' THEN
                EXIT;
            END IF;
            
            -- Exit if sell order is fully matched
            IF sell_rec.status = 'matched' THEN
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'matches_made', total_matches,
        'message', format('Order matching completed: %s matches made', total_matches)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error in order matching: ' || SQLERRM,
            'error_code', 'MATCHING_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to automatically run matching (can be called by cron)
CREATE OR REPLACE FUNCTION auto_match_orders()
RETURNS void AS $$
BEGIN
    PERFORM match_orders();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
