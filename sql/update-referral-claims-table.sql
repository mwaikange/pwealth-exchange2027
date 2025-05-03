-- Add necessary columns to the referral_claims table
ALTER TABLE referral_claims 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'claimed',
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS reset_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reset_reason VARCHAR(50);

-- Create a history table to track claim status changes
CREATE TABLE IF NOT EXISTS referral_claim_history (
  id SERIAL PRIMARY KEY,
  referred_uuid UUID NOT NULL,
  level INT NOT NULL,
  action VARCHAR(20) NOT NULL,
  action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details TEXT
);
