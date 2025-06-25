-- Create exchange order tables for Phase 6
-- Run this first to set up the order matching system

-- 1. Create buy_orders table
CREATE TABLE IF NOT EXISTS buy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shares_requested NUMERIC NOT NULL CHECK (shares_requested > 0),
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 50), -- Minimum 50 NAD
    price_per_share NUMERIC NOT NULL CHECK (price_per_share > 0),
    shares_filled NUMERIC DEFAULT 0 CHECK (shares_filled >= 0),
    amount_filled NUMERIC DEFAULT 0 CHECK (amount_filled >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create sell_orders table
CREATE TABLE IF NOT EXISTS sell_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shares_available NUMERIC NOT NULL CHECK (shares_available > 0),
    shares_remaining NUMERIC NOT NULL CHECK (shares_remaining >= 0),
    total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
    price_per_share NUMERIC NOT NULL CHECK (price_per_share > 0),
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'matched', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ DEFAULT (DATE_TRUNC('week', NOW()) + INTERVAL '6 days' + INTERVAL '23 hours 59 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create matched_orders table for tracking matches
CREATE TABLE IF NOT EXISTS matched_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buy_order_id UUID REFERENCES buy_orders(id) ON DELETE CASCADE,
    sell_order_id UUID REFERENCES sell_orders(id) ON DELETE CASCADE,
    buyer_uuid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_uuid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shares_matched NUMERIC NOT NULL CHECK (shares_matched > 0),
    price_per_share NUMERIC NOT NULL CHECK (price_per_share > 0),
    total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
    matched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_buy_orders_user_uuid ON buy_orders(user_uuid);
CREATE INDEX idx_buy_orders_status ON buy_orders(status);
CREATE INDEX idx_buy_orders_created_at ON buy_orders(created_at);

CREATE INDEX idx_sell_orders_user_uuid ON sell_orders(user_uuid);
CREATE INDEX idx_sell_orders_status ON sell_orders(status);
CREATE INDEX idx_sell_orders_price ON sell_orders(price_per_share);
CREATE INDEX idx_sell_orders_created_at ON sell_orders(created_at);
CREATE INDEX idx_sell_orders_expires_at ON sell_orders(expires_at);

CREATE INDEX idx_matched_orders_buy_order ON matched_orders(buy_order_id);
CREATE INDEX idx_matched_orders_sell_order ON matched_orders(sell_order_id);
CREATE INDEX idx_matched_orders_matched_at ON matched_orders(matched_at);

-- Enable RLS
ALTER TABLE buy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sell_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE matched_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own buy orders" ON buy_orders
    FOR SELECT USING (auth.uid() = user_uuid);

CREATE POLICY "Users can insert own buy orders" ON buy_orders
    FOR INSERT WITH CHECK (auth.uid() = user_uuid);

CREATE POLICY "Users can view own sell orders" ON sell_orders
    FOR SELECT USING (auth.uid() = user_uuid);

CREATE POLICY "Users can insert own sell orders" ON sell_orders
    FOR INSERT WITH CHECK (auth.uid() = user_uuid);

CREATE POLICY "Users can view own matched orders" ON matched_orders
    FOR SELECT USING (auth.uid() = buyer_uuid OR auth.uid() = seller_uuid);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_buy_orders_timestamp
    BEFORE UPDATE ON buy_orders
    FOR EACH ROW EXECUTE FUNCTION update_order_timestamp();

CREATE TRIGGER update_sell_orders_timestamp
    BEFORE UPDATE ON sell_orders
    FOR EACH ROW EXECUTE FUNCTION update_order_timestamp();
