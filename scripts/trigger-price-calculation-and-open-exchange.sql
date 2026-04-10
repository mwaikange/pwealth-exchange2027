-- Simple price calculation and exchange opening
-- Sets everything to current date and time

DO $$
DECLARE
    price_result JSON;
    open_result JSON;
    windhoek_time TIMESTAMP;
BEGIN
    windhoek_time := (NOW() AT TIME ZONE 'UTC') + INTERVAL '2 hours';
    
    RAISE NOTICE 'Starting price calculation and exchange opening...';
    RAISE NOTICE 'Current Windhoek time: %', windhoek_time;
    
    -- Calculate weekly share price
    RAISE NOTICE 'Calculating weekly share price...';
    SELECT calculate_weekly_share_price_simplified() INTO price_result;
    
    IF (price_result->>'success')::BOOLEAN THEN
        RAISE NOTICE 'Price calculation SUCCESS';
        RAISE NOTICE 'Final price: N$%', price_result->>'final_price';
    ELSE
        RAISE NOTICE 'Price calculation FAILED: %', price_result->>'message';
    END IF;
    
    -- Open exchange
    RAISE NOTICE 'Opening exchange...';
    SELECT open_exchange_weekly() INTO open_result;
    
    IF (open_result->>'success')::BOOLEAN THEN
        RAISE NOTICE 'Exchange opening SUCCESS';
        RAISE NOTICE 'Trading is now open';
    ELSE
        RAISE NOTICE 'Exchange opening FAILED: %', open_result->>'message';
    END IF;
    
    RAISE NOTICE 'Process completed';
    
END $$;
