-- Drop the problematic check constraints if they exist
ALTER TABLE share_transactions DROP CONSTRAINT IF EXISTS share_transactions_transaction_type_check;
ALTER TABLE buy_orders DROP CONSTRAINT IF EXISTS buy_orders_status_check;
ALTER TABLE sell_orders DROP CONSTRAINT IF EXISTS sell_orders_status_check;

-- Create or recreate the enums with the correct values
DROP TYPE IF EXISTS transaction_type CASCADE;
CREATE TYPE transaction_type AS ENUM (
    'buy_order_placed',
    'sell_order_placed', 
    'shares_purchased',
    'shares_sold',
    'buy',
    'sell',
    'transfer',
    'cashout'
);

DROP TYPE IF EXISTS order_status CASCADE;
CREATE TYPE order_status AS ENUM (
    'pending',
    'partial', 
    'completed',
    'cancelled',
    'available',
    'expired',
    'filled'
);

-- Update the share_transactions table to use the enum
ALTER TABLE share_transactions 
ALTER COLUMN transaction_type TYPE transaction_type 
USING transaction_type::transaction_type;

-- Update the buy_orders table to use the enum  
ALTER TABLE buy_orders 
ALTER COLUMN status TYPE order_status 
USING status::order_status;

-- Update the sell_orders table to use the enum
ALTER TABLE sell_orders 
ALTER COLUMN status TYPE order_status 
USING status::order_status;
