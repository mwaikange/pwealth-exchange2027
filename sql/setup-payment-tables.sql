-- Create pay_countries table
CREATE TABLE IF NOT EXISTS pay_countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  currency_code VARCHAR(10) NOT NULL,
  currency_symbol VARCHAR(10) NOT NULL,
  exchange_rate DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pay_banks table
CREATE TABLE IF NOT EXISTS pay_banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id UUID NOT NULL REFERENCES pay_countries(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  payment_number VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pay_networks table
CREATE TABLE IF NOT EXISTS pay_networks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id UUID NOT NULL REFERENCES pay_countries(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pay_configs table
CREATE TABLE IF NOT EXISTS pay_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id UUID NOT NULL REFERENCES pay_countries(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES pay_banks(id) ON DELETE CASCADE,
  require_name BOOLEAN NOT NULL DEFAULT true,
  require_date BOOLEAN NOT NULL DEFAULT true,
  require_reference BOOLEAN NOT NULL DEFAULT true,
  require_amount BOOLEAN NOT NULL DEFAULT true,
  require_mobile BOOLEAN NOT NULL DEFAULT true,
  require_screenshot BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(country_id, bank_id)
);

-- Create pay_submissions table
CREATE TABLE IF NOT EXISTS pay_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  country_id UUID NOT NULL REFERENCES pay_countries(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES pay_banks(id) ON DELETE CASCADE,
  network_id UUID REFERENCES pay_networks(id) ON DELETE SET NULL,
  name VARCHAR(255),
  transaction_date DATE,
  reference_number VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  amount_usd DECIMAL(10, 2) NOT NULL,
  mobile_number VARCHAR(255),
  screenshot_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data for Namibia
INSERT INTO pay_countries (name, code, currency_code, currency_symbol, exchange_rate)
VALUES ('Namibia', 'NA', 'NAD', 'N$', 18.5)
ON CONFLICT DO NOTHING;

-- Get the Namibia country ID
DO $$
DECLARE
  namibia_id UUID;
BEGIN
  SELECT id INTO namibia_id FROM pay_countries WHERE code = 'NA';
  
  -- Insert banks for Namibia
  INSERT INTO pay_banks (country_id, name, payment_number)
  VALUES 
    (namibia_id, 'Bank Windhoek', '085 8007296'),
    (namibia_id, 'First National Bank', '085 8007297'),
    (namibia_id, 'Standard Bank', '085 8007298')
  ON CONFLICT DO NOTHING;
  
  -- Insert networks for Namibia
  INSERT INTO pay_networks (country_id, name)
  VALUES 
    (namibia_id, 'Telecom Namibia'),
    (namibia_id, 'MTC')
  ON CONFLICT DO NOTHING;
  
  -- Insert default config for Namibia
  INSERT INTO pay_configs (country_id, bank_id, require_name, require_date, require_reference, require_amount, require_mobile, require_screenshot)
  VALUES (namibia_id, NULL, true, true, true, true, true, true)
  ON CONFLICT DO NOTHING;
END $$;
