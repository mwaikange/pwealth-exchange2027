-- First, let's check what constraints exist on the tables
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
    AND tc.table_name IN ('share_transactions', 'buy_orders', 'sell_orders')
    AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;

-- Check what columns and their types exist in share_transactions
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'share_transactions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing enums
SELECT t.typname, e.enumlabel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('order_status', 'transaction_type')
ORDER BY t.typname, e.enumsortorder;
