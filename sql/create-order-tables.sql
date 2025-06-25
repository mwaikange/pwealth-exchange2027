-- Create buy_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS buy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
    price_per_share NUMERIC NOT NULL CHECK (price_per_share > 0),
    shares_requested NUMERIC NOT NULL CHECK (shares_requested > 0),
    shares_fulfilled NUMERIC DEFAULT 0 CHECK (shares_fulfilled >= 0),
    amount_filled NUMERIC DEFAULT 0 CHECK (amount_filled >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'matched', 'partial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sell_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS sell_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shares_available NUMERIC NOT NULL CHECK (shares_available > 0),
    shares_remaining NUMERIC NOT NULL CHECK (shares_remaining >= 0),
    price_per_share NUMERIC NOT NULL CHECK (price_per_share > 0),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'matched', 'expired', 'cancelled', 'partial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_buy_orders_status ON buy_orders(status);
CREATE INDEX IF NOT EXISTS idx_buy_orders_user ON buy_orders(user_uuid);
CREATE INDEX IF NOT EXISTS idx_buy_orders_created ON buy_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_sell_orders_status ON sell_orders(status);
CREATE INDEX IF NOT EXISTS idx_sell_orders_user ON sell_orders(user_uuid);
CREATE INDEX IF NOT EXISTS idx_sell_orders_created ON sell_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_sell_orders_price ON sell_orders(price_per_share);

-- Enable RLS
ALTER TABLE buy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sell_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for buy_orders
CREATE POLICY "Users can view all buy orders" ON buy_orders
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own buy orders" ON buy_orders
    FOR INSERT WITH CHECK (auth.uid() = user_uuid);

CREATE POLICY "Users can update their own buy orders" ON buy_orders
    FOR UPDATE USING (auth.uid() = user_uuid);

-- RLS Policies for sell_orders
CREATE POLICY "Users can view all sell orders" ON sell_orders
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own sell orders" ON sell_orders
    FOR INSERT WITH CHECK (auth.uid() = user_uuid);

CREATE POLICY "Users can update their own sell orders" ON sell_orders
    FOR UPDATE USING (auth.uid() = user_uuid);
