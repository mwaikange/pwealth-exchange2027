-- Update all price-related functions to use current_pricing_info table
CREATE OR REPLACE FUNCTION get_current_share_price()
RETURNS NUMERIC AS $$
DECLARE
    current_price NUMERIC;
BEGIN
    -- Get the latest share price from current_pricing_info table
    SELECT current_price INTO current_price
    FROM current_pricing_info
    ORDER BY week_start DESC
    LIMIT 1;
    
    -- If no price found, return default
    IF current_price IS NULL THEN
        current_price := 100.00;
    END IF;
    
    RETURN current_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for easier price access across the application
CREATE OR REPLACE VIEW current_market_info AS
SELECT 
    current_price,
    peg_price,
    average_hodl_percentage,
    latest_daily_hodl,
    latest_hodl_date,
    shares_issued,
    total_supply,
    week_start
FROM current_pricing_info
ORDER BY week_start DESC
LIMIT 1;

-- Update the auto-fill buy orders function to use current_pricing_info
CREATE OR REPLACE FUNCTION auto_fill_buy_orders()
RETURNS JSON AS $$
DECLARE
    current_price NUMERIC;
    orders_filled INTEGER := 0;
    buy_rec RECORD;
BEGIN
    -- Get current price from current_pricing_info
    SELECT current_price INTO current_price
    FROM current_pricing_info
    ORDER BY week_start DESC
    LIMIT 1;
    
    IF current_price IS NULL THEN
        current_price := 100.00;
    END IF;
    
    -- Auto-fill buy orders after 90 seconds
    FOR buy_rec IN
        SELECT * FROM buy_orders 
        WHERE status = 'pending' 
        AND created_at < NOW() - INTERVAL '90 seconds'
    LOOP
        -- Update buy order status
        UPDATE buy_orders 
        SET status = 'filled',
            shares_fulfilled = shares_requested,
            amount_filled = total_amount,
            updated_at = NOW()
        WHERE id = buy_rec.id;
        
        -- Credit shares to hold_pre wallet
        INSERT INTO user_shares (user_uuid, wallet_type, shares, source, updated_at)
        VALUES (buy_rec.user_uuid, 'hold_pre', buy_rec.shares_requested, 'buy_order_fill', NOW())
        ON CONFLICT (user_uuid, wallet_type)
        DO UPDATE SET 
            shares = user_shares.shares + EXCLUDED.shares,
            updated_at = NOW();
        
        -- Log transaction
        INSERT INTO share_transactions (
            user_uuid, transaction_type, shares, price_per_share, total_amount,
            to_wallet, status, description, created_at
        ) VALUES (
            buy_rec.user_uuid, 'buy', buy_rec.shares_requested, current_price, buy_rec.total_amount,
            'hold_pre', 'completed', 'Auto-filled buy order after 90 seconds', NOW()
        );
        
        orders_filled := orders_filled + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'orders_filled', orders_filled,
        'current_price', current_price,
        'message', format('Auto-filled %s buy orders at price N$%s', orders_filled, current_price)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run auto-fill every minute
SELECT cron.schedule(
    'auto-fill-buy-orders',
    '* * * * *', -- Every minute
    'SELECT auto_fill_buy_orders();'
);
