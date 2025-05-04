-- Function to reset referral claims when a user's vesting schedules are reset
CREATE OR REPLACE FUNCTION reset_referral_claims_for_user(p_referred_uuid UUID, p_level INT)
RETURNS VOID AS $$
BEGIN
  -- Update the status of all claims for this referred user at this level
  UPDATE referral_claims
  SET status = 'reset', 
      reset_at = NOW(),
      reset_reason = 'vesting_schedule_reset'
  WHERE referred_uuid = p_referred_uuid
    AND level = p_level;
    
  -- Log the reset action
  INSERT INTO referral_claim_history (
    referred_uuid, 
    level, 
    action, 
    action_timestamp, 
    details
  ) VALUES (
    p_referred_uuid,
    p_level,
    'reset',
    NOW(),
    'Reset due to vesting schedule reset'
  );
END;
$$ LANGUAGE plpgsql;
