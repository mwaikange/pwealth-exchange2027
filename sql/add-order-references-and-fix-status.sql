-- Add reference columns to buy_orders and sell_orders tables
ALTER TABLE buy_orders ADD COLUMN IF NOT EXISTS buy_ref TEXT;
ALTER TABLE sell_orders ADD COLUMN IF NOT EXISTS sell_ref TEXT;

-- Create function to generate 6-digit reference numbers
CREATE OR REPLACE FUNCTION generate_order_reference(order_type TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN order_type || '_' || LPAD(FLOOR(RANDOM() * 999999 + 100000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Update existing orders with reference numbers
UPDATE buy_orders 
SET buy_ref = generate_order_reference('Buy')
WHERE buy_ref IS NULL;

UPDATE sell_orders 
SET sell_ref = generate_order_reference('Sell')
WHERE sell_ref IS NULL;

-- Create triggers to auto-generate references for new orders
CREATE OR REPLACE FUNCTION set_buy_order_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.buy_ref IS NULL THEN
        NEW.buy_ref := generate_order_reference('Buy');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_sell_order_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sell_ref IS NULL THEN
        NEW.sell_ref := generate_order_reference('Sell');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_set_buy_order_reference ON buy_orders;
DROP TRIGGER IF EXISTS trigger_set_sell_order_reference ON sell_orders;

-- Create triggers
CREATE TRIGGER trigger_set_buy_order_reference
    BEFORE INSERT ON buy_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_buy_order_reference();

CREATE TRIGGER trigger_set_sell_order_reference
    BEFORE INSERT ON sell_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_sell_order_reference();

-- Fix status logic function
CREATE OR REPLACE FUNCTION fix_order_statuses()
RETURNS TEXT AS $$
DECLARE
    fixed_count INTEGER := 0;
    buy_order RECORD;
    sell_order RECORD;
    fill_percentage NUMERIC;
BEGIN
    -- Fix buy order statuses
    FOR buy_order IN 
        SELECT id, total_amount, amount_filled, status
        FROM buy_orders 
        WHERE status NOT IN ('cancelled', 'expired')
    LOOP
        fill_percentage := CASE 
            WHEN buy_order.total_amount > 0 THEN 
                (buy_order.amount_filled / buy_order.total_amount) * 100
            ELSE 0
        END;
        
        -- Determine correct status
        IF fill_percentage = 0 THEN
            IF buy_order.status != 'pending' THEN
                UPDATE buy_orders SET status = 'pending' WHERE id = buy_order.id;
                fixed_count := fixed_count + 1;
            END IF;
        ELSIF fill_percentage > 0 AND fill_percentage < 100 THEN
            IF buy_order.status != 'partial' THEN
                UPDATE buy_orders SET status = 'partial' WHERE id = buy_order.id;
                fixed_count := fixed_count + 1;
            END IF;
        ELSIF fill_percentage >= 100 THEN
            IF buy_order.status != 'matched' THEN
                UPDATE buy_orders SET status = 'matched' WHERE id = buy_order.id;
                fixed_count := fixed_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    -- Fix sell order statuses
    FOR sell_order IN 
        SELECT id, shares_available, shares_remaining, status
        FROM sell_orders 
        WHERE status NOT IN ('cancelled', 'expired')
    LOOP
        fill_percentage := CASE 
            WHEN sell_order.shares_available > 0 THEN 
                ((sell_order.shares_available - sell_order.shares_remaining) / sell_order.shares_available) * 100
            ELSE 0
        END;
        
        -- Determine correct status
        IF fill_percentage = 0 THEN
            IF sell_order.status != 'pending' THEN
                UPDATE sell_orders SET status = 'pending' WHERE id = sell_order.id;
                fixed_count := fixed_count + 1;
            END IF;
        ELSIF fill_percentage > 0 AND fill_percentage < 100 THEN
            IF sell_order.status != 'partial' THEN
                UPDATE sell_orders SET status = 'partial' WHERE id = sell_order.id;
                fixed_count := fixed_count + 1;
            END IF;
        ELSIF fill_percentage >= 100 THEN
            IF sell_order.status != 'matched' THEN
                UPDATE sell_orders SET status = 'matched' WHERE id = sell_order.id;
                fixed_count := fixed_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN 'Fixed ' || fixed_count || ' order statuses';
END;
$$ LANGUAGE plpgsql;

-- Run the fix immediately
SELECT fix_order_statuses();

-- Check results
SELECT 'BUY ORDER STATUS DISTRIBUTION' as section;
SELECT status, COUNT(*) as count FROM buy_orders GROUP BY status;

SELECT 'SELL ORDER STATUS DISTRIBUTION' as section;
SELECT status, COUNT(*) as count FROM sell_orders GROUP BY status;

-- Show sample orders with references
SELECT 'SAMPLE ORDERS WITH REFERENCES' as section;
SELECT 
    'Buy Orders' as type,
    buy_ref as reference,
    total_amount,
    amount_filled,
    ROUND((amount_filled / total_amount) * 100, 2) as fill_percentage,
    status
FROM buy_orders 
ORDER BY created_at DESC 
LIMIT 3;

SELECT 
    'Sell Orders' as type,
    sell_ref as reference,
    shares_available,
    shares_remaining,
    ROUND(((shares_available - shares_remaining) / shares_available) * 100, 2) as fill_percentage,
    status
FROM sell_orders 
ORDER BY created_at DESC 
LIMIT 3;
