-- ==============================================
-- STEP 4: ADD ORDER REFERENCE COLUMNS
-- ==============================================

-- Add reference columns to buy_orders if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' AND column_name = 'buy_ref'
    ) THEN
        ALTER TABLE buy_orders ADD COLUMN buy_ref TEXT UNIQUE;
        RAISE NOTICE 'Added buy_ref column to buy_orders';
    ELSE
        RAISE NOTICE 'buy_ref column already exists in buy_orders';
    END IF;
END $$;

-- Add reference columns to sell_orders if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sell_orders' AND column_name = 'sell_ref'
    ) THEN
        ALTER TABLE sell_orders ADD COLUMN sell_ref TEXT UNIQUE;
        RAISE NOTICE 'Added sell_ref column to sell_orders';
    ELSE
        RAISE NOTICE 'sell_ref column already exists in sell_orders';
    END IF;
END $$;

-- Create sequences for reference generation
CREATE SEQUENCE IF NOT EXISTS buy_order_ref_seq START 100000;
CREATE SEQUENCE IF NOT EXISTS sell_order_ref_seq START 100000;

-- Create function to generate buy order reference
CREATE OR REPLACE FUNCTION generate_buy_ref()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Buy_' || LPAD(nextval('buy_order_ref_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create function to generate sell order reference
CREATE OR REPLACE FUNCTION generate_sell_ref()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Sell_' || LPAD(nextval('sell_order_ref_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for buy orders
CREATE OR REPLACE FUNCTION set_buy_order_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.buy_ref IS NULL THEN
        NEW.buy_ref = generate_buy_ref();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for sell orders
CREATE OR REPLACE FUNCTION set_sell_order_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sell_ref IS NULL THEN
        NEW.sell_ref = generate_sell_ref();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_set_buy_order_ref ON buy_orders;
CREATE TRIGGER trigger_set_buy_order_ref
    BEFORE INSERT ON buy_orders
    FOR EACH ROW EXECUTE FUNCTION set_buy_order_ref();

DROP TRIGGER IF EXISTS trigger_set_sell_order_ref ON sell_orders;
CREATE TRIGGER trigger_set_sell_order_ref
    BEFORE INSERT ON sell_orders
    FOR EACH ROW EXECUTE FUNCTION set_sell_order_ref();

-- Update existing orders without references
UPDATE buy_orders SET buy_ref = generate_buy_ref() WHERE buy_ref IS NULL;
UPDATE sell_orders SET sell_ref = generate_sell_ref() WHERE sell_ref IS NULL;

SELECT 'ORDER REFERENCE SYSTEM READY' as status;
