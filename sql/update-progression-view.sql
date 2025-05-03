-- Update the progression view to consider the reset status
CREATE OR REPLACE VIEW progression_view AS
SELECT
  r.referred_uuid,
  r.level,
  r.invested_count,
  r.referral_uuid,
  r.referred_referral_code,
  r.referral_code,
  r.country,
  r.referral_date,
  CASE
    WHEN rc.status = 'reset' OR rc.id IS NULL THEN
      CASE
        WHEN r.invested_count >= 5 THEN 'claimable'
        ELSE 'Locked'
      END
    WHEN rc.status = 'claimed' THEN 'claimed'
    ELSE 'Locked'
  END as button_state
FROM
  referrals r
LEFT JOIN
  referral_claims rc ON r.referred_uuid = rc.referred_uuid AND r.level = rc.level AND rc.claimed_by = r.referral_uuid
WHERE
  r.referral_uuid IS NOT NULL;
