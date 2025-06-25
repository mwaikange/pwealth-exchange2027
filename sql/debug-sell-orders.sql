-- Let's check what tables exist and what data is there
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%sell%';

-- Check if active_sell_orders exists
SELECT * FROM active_sell_orders LIMIT 5;

-- Check sell_orders table
SELECT * FROM sell_orders LIMIT 5;

-- Check what statuses are actually being used
SELECT DISTINCT status FROM sell_orders;
