CREATE OR REPLACE FUNCTION auto_claim_referral_rewards(
  referred_user_uuid UUID,
  level_number INTEGER
) RETURNS VOID AS $$
DECLARE
  referrer_uuid UUID;
  reward_amount DECIMAL;
  transaction_description TEXT;
BEGIN
  -- Find the referrer for this user
  SELECT referrer_uuid INTO referrer_uuid 
  FROM users 
  WHERE user_uuid = referred_user_uuid;
  
  -- If no referrer, exit
  IF referrer_uuid IS NULL THEN
    RETURN;
  END IF;
  
  -- Determine reward amount based on level
  CASE level_number
    WHEN 1 THEN reward_amount := 50;
    WHEN 2 THEN reward_amount := 100;
    WHEN 3 THEN reward_amount := 150;
    WHEN 4 THEN reward_amount := 200;
    WHEN 5 THEN reward_amount := 250;
    ELSE reward_amount := 0;
  END CASE;
  
  -- Check if there's an unclaimed but eligible reward
  IF EXISTS (
    SELECT 1 
    FROM referral_claims 
    WHERE referrer_uuid = referrer_uuid 
    AND referred_uuid = referred_user_uuid 
    AND level = level_number
    AND status = 'claimable'
  ) THEN
    -- Update the claim status to 'claimed'
    UPDATE referral_claims
    SET 
      status = 'claimed',
      claimed_at = NOW()
    WHERE 
      referrer_uuid = referrer_uuid 
      AND referred_uuid = referred_user_uuid 
      AND level = level_number
      AND status = 'claimable';
    
    -- Add tokens to referrer's cashout balance
    UPDATE users
    SET pwt_cashout_balance = pwt_cashout_balance + reward_amount
    WHERE user_uuid = referrer_uuid;
    
    -- Record the transaction
    transaction_description := '+Auto Referral Claim LvL' || level_number;
    
    INSERT INTO transactions (
      user_uuid,
      transaction_type,
      amount,
      description,
      status,
      created_at
    ) VALUES (
      referrer_uuid,
      'referral_reward',
      reward_amount,
      transaction_description,
      'completed',
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
