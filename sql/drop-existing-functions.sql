-- Drop existing functions to avoid return type conflicts
-- Run this FIRST before creating the updated functions

DROP FUNCTION IF EXISTS auto_fill_buy_orders();
DROP FUNCTION IF EXISTS match_orders();
DROP FUNCTION IF EXISTS place_buy_order(UUID, NUMERIC, NUMERIC);

-- Also drop any variations that might exist
DROP FUNCTION IF EXISTS auto_fill_buy_orders() CASCADE;
DROP FUNCTION IF EXISTS match_orders() CASCADE;
DROP FUNCTION IF EXISTS place_buy_order(UUID, NUMERIC, NUMERIC) CASCADE;
