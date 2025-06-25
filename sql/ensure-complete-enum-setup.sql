-- Comprehensive enum setup for order_status
-- This ensures all expected enum values exist

DO $$
DECLARE
    enum_exists boolean;
BEGIN
    -- Check if order_status enum exists
    SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'order_status'
    ) INTO enum_exists;
    
    -- Create enum if it doesn't exist
    IF NOT enum_exists THEN
        CREATE TYPE order_status AS ENUM (
            'pending',
            'partial', 
            'completed',
            'filled',
            'cancelled',
            'available',
            'expired'
        );
        RAISE NOTICE 'Created order_status enum';
    ELSE
        -- Add missing values to existing enum
        BEGIN
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'partial';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'filled';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'matched';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'expired';
            RAISE NOTICE 'Added missing enum values';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'Enum values already exist';
        END;
    END IF;
END $$;

-- Ensure tables use the enum type
DO $$
BEGIN
    -- Update buy_orders status column to use enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buy_orders' AND column_name = 'status' AND data_type = 'text'
    ) THEN
        -- First ensure all status values are valid
        UPDATE buy_orders SET status = 'pending' 
        WHERE status NOT IN ('pending', 'partial', 'completed', 'filled', 'cancelled');
        
        -- Convert to enum
        ALTER TABLE buy_orders ALTER COLUMN status TYPE order_status USING status::order_status;
        RAISE NOTICE 'Updated buy_orders.status to use enum';
    END IF;
    
    -- Update sell_orders status column to use enum  
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sell_orders' AND column_name = 'status' AND data_type = 'text'
    ) THEN
        -- First ensure all status values are valid
        UPDATE sell_orders SET status = 'available' 
        WHERE status NOT IN ('available', 'partial', 'completed', 'expired', 'cancelled');
        
        -- Convert to enum
        ALTER TABLE sell_orders ALTER COLUMN status TYPE order_status USING status::order_status;
        RAISE NOTICE 'Updated sell_orders.status to use enum';
    END IF;
END $$;

-- Verify the setup
SELECT 'order_status enum values:' as info;
SELECT unnest(enum_range(NULL::order_status)) as enum_value;

-- Show current status distribution
SELECT 'buy_orders status distribution:' as info;
SELECT status, COUNT(*) as count FROM buy_orders GROUP BY status;

SELECT 'sell_orders status distribution:' as info;  
SELECT status, COUNT(*) as count FROM sell_orders GROUP BY status;

-- Create refresh_views placeholder if it doesn't exist
CREATE OR REPLACE FUNCTION refresh_views()
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'refresh_views() placeholder function executed';
END;
$$ LANGUAGE plpgsql;

SELECT 'Setup complete!' as result;
