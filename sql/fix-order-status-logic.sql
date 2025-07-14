-- ==============================================
-- FIX ORDER STATUS LOGIC FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION fix_order_statuses()
RETURNS TEXT AS $$
DECLARE
    fixed_count INTEGER := 0;
    buy_order RECORD;
    sell_order RECORD;
    fill_percentage NUMERIC;
    correct_status order_status;
BEGIN
    -- Fix buy order statuses
    FOR buy_order IN 
        SELECT id, total_amount, amount_filled, status
        FROM buy_orders 
        WHERE status NOT IN ('cancelled', 'expired')
    LOOP
        -- Calculate fill percentage
        fill_percentage := CASE 
            WHEN buy_order.total_amount > 0 THEN 
                (buy_order.amount_filled / buy_order.total_amount) * 100
            ELSE 0
        END;
        
        -- Determine correct status
        IF fill_percentage = 0 THEN
            correct_status := 'pending'::order_status;
        ELSIF fill_percentage > 0 AND fill_percentage < 100 THEN
            correct_status := 'partial'::order_status;
        ELSIF fill_percentage >= 100 THEN
            correct_status := 'matched'::order_status;
        ELSE
            correct_status := buy_order.status; -- Keep existing if unclear
        END IF;
        
        -- Update if status is incorrect
        IF buy_order.status != correct_status THEN
            UPDATE buy_orders 
            SET status = correct_status 
            WHERE id = buy_order.id;
            fixed_count := fixed_count + 1;
        END IF;
    END LOOP;
    
    -- Fix sell order statuses
    FOR sell_order IN 
        SELECT id, shares_available, shares_remaining, status
        FROM sell_orders 
        WHERE status NOT IN ('cancelled', 'expired')
    LOOP
        -- Calculate fill percentage
        fill_percentage := CASE 
            WHEN sell_order.shares_available > 0 THEN 
                ((sell_order.shares_available - sell_order.shares_remaining) / sell_order.shares_available) * 100
            ELSE 0
        END;
        
        -- Determine correct status
        IF fill_percentage = 0 THEN
            correct_status := 'pending'::order_status;
        ELSIF fill_percentage > 0 AND fill_percentage < 100 THEN
            correct_status := 'partial'::order_status;
        ELSIF fill_percentage >= 100 THEN
            correct_status := 'matched'::order_status;
        ELSE
            correct_status := sell_order.status; -- Keep existing if unclear
        END IF;
        
        -- Update if status is incorrect
        IF sell_order.status != correct_status THEN
            UPDATE sell_orders 
            SET status = correct_status 
            WHERE id = sell_order.id;
            fixed_count := fixed_count + 1;
        END IF;
    END LOOP;
    
    RETURN 'Fixed ' || fixed_count || ' order statuses';
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT fix_order_statuses();

-- Show current status distribution
SELECT 'BUY ORDER STATUS DISTRIBUTION' as section;
SELECT status::text, COUNT(*) as count FROM buy_orders GROUP BY status ORDER BY status;

SELECT 'SELL ORDER STATUS DISTRIBUTION' as section;
SELECT status::text, COUNT(*) as count FROM sell_orders GROUP BY status ORDER BY status;
