-- Create a view that combines referral data with user details and vesting progress
CREATE OR REPLACE VIEW referral_view AS
SELECT 
  r.referral_id,
  r.user_uuid AS referrer_uuid,
  r.referred_uuid,
  r.referred_email,
  r.referrer_email,
  r.referral_date,
  r.referred_referral_code,
  r.status,
  r.claimed,
  r.claim_date,
  u.country,
  u.email_confirmed_at,
  COALESCE(vp.active_level, '1') AS level,
  COALESCE(r.active_count, 0) AS active_count
FROM 
  referrals r
LEFT JOIN 
  app_users u ON r.referred_uuid = u.user_uuid
LEFT JOIN (
  -- Subquery to determine the highest active level
  SELECT 
    user_uuid,
    MAX(level) AS active_level
  FROM 
    vesting_schedules
  WHERE 
    invested = TRUE AND claimed = FALSE
  GROUP BY 
    user_uuid
) vp ON r.referred_uuid = vp.user_uuid;
