-- ==============================================
-- ADD ORDER REFERENCE COLUMNS AND SYSTEM
-- ==============================================

BEGIN;

-- Step 1: Add reference columns to both order tables
ALTER TABLE buy_orders ADD COLUMN IF NOT EXISTS buy_ref TEXT;
ALTER TABLE sell_orders ADD COLUMN IF NOT EXISTS sell_ref TEXT;

-- Step 2: Create function to generate 6-digit reference numbers
CREATE OR REPLACE FUNCTION generate_order_reference(order_type TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Generate format: Buy_123456 or Sell_789012
    RETURN order_type || '_' || LPAD(FLOOR(RANDOM() * 899999 + 100000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update ALL existing orders with reference numbers
UPDATE buy_orders 
SET buy_ref = generate_order_reference('Buy')
WHERE buy_ref IS NULL;

UPDATE sell_orders 
SET sell_ref = generate_order_reference('Sell')
WHERE sell_ref IS NULL;

-- Step 4: Create trigger functions for auto-generation
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

-- Step 5: Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_set_buy_order_reference ON buy_orders;
DROP TRIGGER IF EXISTS trigger_set_sell_order_reference ON sell_orders;

-- Step 6: Create triggers for new orders
CREATE TRIGGER trigger_set_buy_order_reference
    BEFORE INSERT ON buy_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_buy_order_reference();

CREATE TRIGGER trigger_set_sell_order_reference
    BEFORE INSERT ON sell_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_sell_order_reference();

-- Step 7: Add constraints to ensure references are unique and not null
ALTER TABLE buy_orders ADD CONSTRAINT buy_ref_not_null CHECK (buy_ref IS NOT NULL);
ALTER TABLE sell_orders ADD CONSTRAINT sell_ref_not_null CHECK (sell_ref IS NOT NULL);

-- Create unique indexes for references
CREATE UNIQUE INDEX IF NOT EXISTS idx_buy_orders_buy_ref ON buy_orders(buy_ref);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sell_orders_sell_ref ON sell_orders(sell_ref);

COMMIT;

-- Step 8: Verify the reference system
SELECT 'ORDER REFERENCE SYSTEM INSTALLED' as status;

SELECT 'BUY ORDER REFERENCES' as section;
SELECT 
    id,
    buy_ref,
    total_amount,
    status,
    created_at
FROM buy_orders 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'SELL ORDER REFERENCES' as section;
SELECT 
    id,
    sell_ref,
    shares_available,
    status,
    created_at
FROM sell_orders 
ORDER BY created_at DESC 
LIMIT 5;

-- Test the trigger by inserting a dummy record and then removing it
INSERT INTO buy_orders (user_uuid, total_amount, price_per_share, status)
SELECT 
    u.id,
    100.00,
    108.20,
    'pending'::order_status
FROM auth.users u 
WHERE u.email = 'mwaikange@gmail.com'
LIMIT 1;

SELECT 'TEST REFERENCE GENERATION' as section;
SELECT buy_ref FROM buy_orders ORDER BY created_at DESC LIMIT 1;

-- Remove the test record
DELETE FROM buy_orders WHERE buy_ref = (SELECT buy_ref FROM buy_orders ORDER BY created_at DESC LIMIT 1);

SELECT 'REFERENCE SYSTEM READY!' as status;
