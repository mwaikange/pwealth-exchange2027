-- Debug function to trace order matching flow
CREATE OR REPLACE FUNCTION debug_order_matching(
    p_buy_order_id UUID DEFAULT NULL,
    p_sell_order_id UUID DEFAULT NULL
)
RETURNS TABLE(
    step_name TEXT,
    details JSONB
) AS $$
BEGIN
    -- Show buy order details
    IF p_buy_order_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            'buy_order_details'::TEXT,
            to_jsonb(bo.*) 
        FROM buy_orders bo 
        WHERE bo.id = p_buy_order_id;
    END IF;
    
    -- Show sell order details  
    IF p_sell_order_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            'sell_order_details'::TEXT,
            to_jsonb(so.*) 
        FROM sell_orders so 
        WHERE so.id = p_sell_order_id;
    END IF;
    
    -- Show matched orders
    RETURN QUERY
    SELECT 
        'matched_orders'::TEXT,
        to_jsonb(mo.*) 
    FROM matched_orders mo 
    WHERE (p_buy_order_id IS NULL OR mo.buy_order_id = p_buy_order_id)
    AND (p_sell_order_id IS NULL OR mo.sell_order_id = p_sell_order_id)
    ORDER BY mo.matched_at DESC;
    
    -- Show recent wallet transactions
    RETURN QUERY
    SELECT 
        'recent_transactions'::TEXT,
        jsonb_agg(
            jsonb_build_object(
                'user_uuid', st.user_uuid,
                'transaction_type', st.transaction_type,
                'shares', st.shares,
                'total_amount', st.total_amount,
                'to_wallet', st.to_wallet,
                'from_wallet', st.from_wallet,
                'created_at', st.created_at
            )
        )
    FROM share_transactions st 
    WHERE st.created_at > NOW() - INTERVAL '1 hour'
    ORDER BY st.created_at DESC;
    
END;
$$ LANGUAGE plpgsql;

-- Usage example:
-- SELECT * FROM debug_order_matching();
-- SELECT * FROM debug_order_matching('specific-buy-order-uuid', NULL);
