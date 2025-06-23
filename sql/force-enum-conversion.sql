-- Force the enum conversion by temporarily dropping the view

-- Step 1: Drop the view that's blocking the conversion
DROP VIEW IF EXISTS user_order_history CASCADE;

-- Step 2: Create the enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'pending',
            'partial', 
            'filled',
            'cancelled',
            'available',
            'completed'
        );
    END IF;
END $$;

-- Step 3: Convert buy_orders status column
ALTER TABLE buy_orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE buy_orders ALTER COLUMN status TYPE order_status USING status::order_status;
ALTER TABLE buy_orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;

-- Step 4: Convert sell_orders status column
ALTER TABLE sell_orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE sell_orders ALTER COLUMN status TYPE order_status USING status::order_status;
ALTER TABLE sell_orders ALTER COLUMN status SET DEFAULT 'available'::order_status;

-- Step 5: Recreate the view with proper enum casting
CREATE VIEW user_order_history AS
-- Buy orders
SELECT 
    'buy' as order_type,
    id,
    user_uuid,
    shares_requested as shares,
    shares_filled,
    total_amount,
    amount_filled,
    price_per_share,
    status::text as status,
    created_at,
    updated_at,
    NULL as expires_at
FROM buy_orders

UNION ALL

-- Sell orders  
SELECT 
    'sell' as order_type,
    id,
    user_uuid,
    shares_available as shares,
    (shares_available - shares_remaining) as shares_filled,
    (shares_available * price_per_share) as total_amount,
    ((shares_available - shares_remaining) * price_per_share) as amount_filled,
    price_per_share,
    status::text as status,
    created_at,
    updated_at,
    expires_at
FROM sell_orders;

-- Step 6: Verify conversion
SELECT 'Enum conversion completed!' as result;
SELECT DISTINCT status FROM buy_orders;
SELECT DISTINCT status FROM sell_orders;
