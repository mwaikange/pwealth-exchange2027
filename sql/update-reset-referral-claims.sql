CREATE OR REPLACE FUNCTION reset_referral_claims_for_user(
  p_referred_uuid UUID,
  p_level INTEGER
) RETURNS VOID AS $$
BEGIN
  -- First, check if there are any unclaimed but claimable rewards
  -- If so, auto-claim them before resetting
  PERFORM auto_claim_referral_rewards(p_referred_uuid, p_level);
  
  -- Now reset any claimed rewards
  UPDATE referral_claims
  SET 
    status = 'reset',
    reset_at = NOW()
  WHERE 
    referred_uuid = p_referred_uuid 
    AND level = p_level
    AND status = 'claimed';
    
  -- Set status back to 'claimable' for the next cycle
  INSERT INTO referral_claims (
    referrer_uuid,
    referred_uuid,
    level,
    status,
    created_at
  )
  SELECT 
    referrer_uuid,
    p_referred_uuid,
    p_level,
    'claimable',
    NOW()
  FROM users
  WHERE user_uuid = p_referred_uuid
  AND referrer_uuid IS NOT NULL
  ON CONFLICT (referrer_uuid, referred_uuid, level) 
  DO UPDATE SET 
    status = 'claimable',
    created_at = NOW(),
    claimed_at = NULL,
    reset_at = NULL;
END;
$$ LANGUAGE plpgsql;
