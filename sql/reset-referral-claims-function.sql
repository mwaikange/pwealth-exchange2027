-- Function to reset referral claims when a user's vesting schedules are reset
-- This function also handles auto-claiming for unclaimed but eligible referrals
CREATE OR REPLACE FUNCTION reset_referral_claims_for_user(p_referred_uuid UUID, p_level INT)
RETURNS VOID AS $$
DECLARE
  r_claim RECORD;
  v_claim_amount INT;
  v_referrer_uuid UUID;
BEGIN
  -- First, check for any unclaimed but eligible referrals
  -- These need to be auto-claimed before resetting
  FOR r_claim IN 
    SELECT 
      rc.referral_uuid AS referrer_uuid,
      rc.level
    FROM 
      progression_view rc
    WHERE 
      rc.referred_uuid = p_referred_uuid
      AND rc.level = p_level
      AND rc.button_state = 'claimable'
      AND rc.invested_count >= 5
      AND NOT EXISTS (
        SELECT 1 FROM referral_claims 
        WHERE referred_uuid = rc.referred_uuid 
        AND level = rc.level 
        AND claimed_by = rc.referral_uuid
      )
  LOOP
    -- Set claim amount based on level
    v_claim_amount := r_claim.level;
    v_referrer_uuid := r_claim.referrer_uuid;
    
    -- Insert a claim record with auto_claimed = true
    INSERT INTO referral_claims (
      referred_uuid, 
      level, 
      claimed_by, 
      status, 
      claimed_at,
      auto_claimed
    ) VALUES (
      p_referred_uuid,
      p_level,
      v_referrer_uuid,
      'auto_claimed',
      NOW(),
      TRUE
    );
    
    -- Update the referrer's balance
    UPDATE balances
    SET pwt_cashout_balance = pwt_cashout_balance + v_claim_amount,
        updated_at = NOW()
    WHERE user_uuid = v_referrer_uuid;
    
    -- Record the transaction
    INSERT INTO transactions (
      transaction_id,
      user_uuid,
      transaction_type,
      account_type,
      amount,
      amount_usd,
      reference,
      description,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_referrer_uuid,
      'AUTO REFERRAL CLAIM-LvL' || p_level,
      'PWT Cashout',
      v_claim_amount,
      v_claim_amount * 10, -- Assuming 1 PWT = $10 USD
      'AUTO-TRX-' || floor(random() * 10000)::text,
      'Auto Referral Claim Level ' || p_level,
      NOW()
    );
    
    -- Log the auto-claim action
    INSERT INTO referral_claim_history (
      referred_uuid, 
      level, 
      action, 
      action_timestamp, 
      details
    ) VALUES (
      p_referred_uuid,
      p_level,
      'auto_claim',
      NOW(),
      'Auto-claimed due to vesting schedule reset'
    );
  END LOOP;

  -- Now update the status of all existing claims for this referred user at this level
  UPDATE referral_claims
  SET status = 'reset', 
      reset_at = NOW(),
      reset_reason = 'vesting_schedule_reset'
  WHERE referred_uuid = p_referred_uuid
    AND level = p_level
    AND status = 'claimed';
    
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
