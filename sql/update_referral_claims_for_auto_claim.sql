-- Add auto_claimed and claim_reason columns to referral_claims table
ALTER TABLE referral_claims 
ADD COLUMN IF NOT EXISTS auto_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS claim_reason VARCHAR(50);

-- Update existing claims to have auto_claimed = FALSE
UPDATE referral_claims
SET auto_claimed = FALSE
WHERE auto_claimed IS NULL;

-- Create an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_referral_claims_auto_claimed 
ON referral_claims(referred_uuid, level, claimed_by, auto_claimed);
