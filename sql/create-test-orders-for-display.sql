-- Create some test orders to verify the Market Buy Orders and Your Buy Orders cards work
-- Only run this if you need test data for development

-- Insert test buy orders (replace the UUIDs with actual user UUIDs from your system)
INSERT INTO buy_orders (
    user_uuid,
    total_amount,
    price_per_share,
    shares_requested,
    shares_filled,
    amount_filled,
    status,
    created_at,
    updated_at
) VALUES 
-- Test pending buy order
(
    '00000000-0000-0000-0000-000000000001', -- Replace with actual user UUID
    500.00,
    100.00,
    5.00,
    0.00,
    0.00,
    'pending'::order_status,
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
),
-- Test partial buy order
(
    '00000000-0000-0000-0000-000000000002', -- Replace with actual user UUID
    1000.00,
    95.00,
    10.53,
    5.26,
    500.00,
    'partial'::order_status,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '30 minutes'
),
-- Test filled buy order
(
    '00000000-0000-0000-0000-000000000003', -- Replace with actual user UUID
    750.00,
    105.00,
    7.14,
    7.14,
    750.00,
    'filled'::order_status,
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '1 hour'
);

-- Insert test sell orders
INSERT INTO sell_orders (
    user_uuid,
    shares_available,
    shares_remaining,
    price_per_share,
    status,
    created_at,
    updated_at
) VALUES 
-- Test available sell order
(
    '00000000-0000-0000-0000-000000000004', -- Replace with actual user UUID
    10.00,
    10.00,
    110.00,
    'available'::order_status,
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
),
-- Test partial sell order
(
    '00000000-0000-0000-0000-000000000005', -- Replace with actual user UUID
    15.00,
    7.50,
    108.00,
    'partial'::order_status,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '45 minutes'
);

-- Note: Remember to replace the UUIDs above with actual user UUIDs from your auth.users table
-- You can get real user UUIDs with: SELECT id, email FROM auth.users LIMIT 5;
