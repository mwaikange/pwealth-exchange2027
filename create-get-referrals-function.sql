-- Create a function to get referrals for a user
CREATE OR REPLACE FUNCTION get_referrals_for_user(user_id UUID)
RETURNS TABLE (
  referral_id UUID,
  user_uuid UUID,
  level INTEGER,
  progress INTEGER,
  status TEXT,
  email TEXT,
  referral_code TEXT,
  country TEXT,
  referral_date TIMESTAMP WITH TIME ZONE,
  claimed BOOLEAN,
  claim_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.referral_id,
    l.user_uuid,
    l.level,
    l.progress,
    l.status,
    l.email,
    l.referral_code,
    l.country,
    r.referral_date,
    r.claimed,
    r.claim_date
  FROM 
    levels l
  LEFT JOIN 
    referrals r ON l.referral_id = r.referral_id
  WHERE 
    l.referrer_uuid = user_id;
END;
$$ LANGUAGE plpgsql;
