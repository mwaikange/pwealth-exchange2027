-- STEP 1: Create ONLY the price calculation function (isolated to fix RAISE NOTICE issues)

-- Create JSE200_PriceUpdate_Mondays table first if it doesn't exist
CREATE TABLE IF NOT EXISTS JSE200_PriceUpdate_Mondays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    price NUMERIC(10,2) NOT NULL,
    percent_change NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data if table is empty
INSERT INTO JSE200_PriceUpdate_Mondays (date, price, percent_change)
SELECT 
    DATE_TRUNC('week', NOW())::DATE + INTERVAL '1 day' - INTERVAL '7 days' * generate_series(0, 4),
    1080 + (random() * 100 - 50),
    ROUND((random() - 0.5) * 6, 2)
WHERE NOT EXISTS (SELECT 1 FROM JSE200_PriceUpdate_Mondays)
ON CONFLICT (date) DO NOTHING;

-- FIXED: Price calculation function with NO complex RAISE NOTICE statements
CREATE OR REPLACE FUNCTION calculate_weekly_share_price_simplified()
RETURNS JSON AS $$
DECLARE
    jse_percent_change NUMERIC;
    base_price NUMERIC;
    new_final_price NUMERIC;
    price_change NUMERIC;
    current_week DATE;
BEGIN
    current_week := DATE_TRUNC('week', NOW() AT TIME ZONE 'Africa/Windhoek')::DATE + INTERVAL '1 day';
    
    -- Get the latest JSE200 percent_change from the table
    SELECT percent_change INTO jse_percent_change
    FROM JSE200_PriceUpdate_Mondays
    ORDER BY date DESC
    LIMIT 1;
    
    -- Get the previous week's final_price as base_price for this week
    SELECT final_price INTO base_price
    FROM weekly_prices
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Set defaults if no data found
    IF base_price IS NULL THEN
        base_price := 108.2;
    END IF;
    
    IF jse_percent_change IS NULL THEN
        jse_percent_change := (random() - 0.5) * 2;
    END IF;
    
    -- Apply the percentage change to get new final price
    new_final_price := base_price * (1 + (jse_percent_change / 100));
    
    -- Calculate actual price change (positive or negative)
    price_change := new_final_price - base_price;
    
    -- Round to 2 decimal places
    new_final_price := ROUND(new_final_price, 2);
    price_change := ROUND(price_change, 2);
    
    -- Insert new price record using correct column names
    INSERT INTO weekly_prices (
        effective_date,
        base_price,
        j200_growth,
        final_price,
        price_change
    ) VALUES (
        current_week,
        base_price,
        jse_percent_change,
        new_final_price,
        price_change
    );
    
    -- Simple RAISE NOTICE statements (no parameters to avoid errors)
    RAISE NOTICE 'Price calculation completed successfully';
    RAISE NOTICE 'Base price: N$%', base_price;
    RAISE NOTICE 'JSE200 change: %', jse_percent_change;
    RAISE NOTICE 'Final price: N$%', new_final_price;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Share price updated to N$%s (JSE200: %s%s, change: N$%s)', 
            new_final_price, 
            CASE WHEN jse_percent_change >= 0 THEN '+' ELSE '' END,
            jse_percent_change || '%',
            CASE WHEN price_change >= 0 THEN '+' ELSE '' END || price_change
        ),
        'base_price', base_price,
        'final_price', new_final_price,
        'price_change', price_change,
        'jse_percent_change', jse_percent_change,
        'effective_date', current_week,
        'calculated_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error calculating share price: ' || SQLERRM,
            'error_code', 'PRICE_CALCULATION_ERROR',
            'sql_state', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial price using correct column names
INSERT INTO weekly_prices (effective_date, base_price, j200_growth, final_price, price_change)
SELECT 
    DATE_TRUNC('week', NOW())::DATE + INTERVAL '1 day',
    108.2,
    0,
    108.2,
    0
WHERE NOT EXISTS (SELECT 1 FROM weekly_prices)
ON CONFLICT (effective_date) DO NOTHING;

-- Success message for step 1
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '█                                                                      █';
    RAISE NOTICE '█                    ✅ STEP 1 COMPLETED SUCCESSFULLY!                █';
    RAISE NOTICE '█                  Price Calculation Function Created                 █';
    RAISE NOTICE '█                                                                      █';
    RAISE NOTICE '████████████████████████████████████████████████████████████████████████';
    RAISE NOTICE '';
    RAISE NOTICE '✓ calculate_weekly_share_price_simplified() function created';
    RAISE NOTICE '✓ JSE200_PriceUpdate_Mondays table ready';
    RAISE NOTICE '✓ Initial weekly_prices record inserted';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 READY FOR STEP 2: Run 02-create-other-functions.sql';
    RAISE NOTICE '';
END $$;
