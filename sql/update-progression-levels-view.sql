-- Update the progression_levels view to have separate button states for each level
CREATE OR REPLACE VIEW progression_levels AS
SELECT
  r.referred_uuid,
  r.level_1,
  r.level_2,
  r.level_3,
  r.referral_uuid,
  
  -- Button state for Level 1
  CASE
    WHEN r.level_1 IS NULL THEN 'Locked'
    WHEN r.level_1 = '5/5' AND rc1.id IS NOT NULL THEN 'claimed'
    WHEN r.level_1 = '5/5' AND rc1.id IS NULL THEN 'claimable'
    ELSE 'Locked'
  END AS button_state_lvl_1,
  
  -- Button state for Level 2
  CASE
    WHEN r.level_2 IS NULL THEN 'Locked'
    WHEN r.level_2 = '5/5' AND rc2.id IS NOT NULL THEN 'claimed'
    WHEN r.level_2 = '5/5' AND rc2.id IS NULL THEN 'claimable'
    ELSE 'Locked'
  END AS button_state_lvl_2,
  
  -- Button state for Level 3
  CASE
    WHEN r.level_3 IS NULL THEN 'Locked'
    WHEN r.level_3 = '5/5' AND rc3.id IS NOT NULL THEN 'claimed'
    WHEN r.level_3 = '5/5' AND rc3.id IS NULL THEN 'claimable'
    ELSE 'Locked'
  END AS button_state_lvl_3
  
FROM referrals_progression_levels r
LEFT JOIN referral_claims rc1 
  ON rc1.referred_uuid = r.referred_uuid AND rc1.level = 1 AND rc1.claimed_by = r.referral_uuid
LEFT JOIN referral_claims rc2 
  ON rc2.referred_uuid = r.referred_uuid AND rc2.level = 2 AND rc2.claimed_by = r.referral_uuid
LEFT JOIN referral_claims rc3 
  ON rc3.referred_uuid = r.referred_uuid AND rc3.level = 3 AND rc3.claimed_by = r.referral_uuid;
