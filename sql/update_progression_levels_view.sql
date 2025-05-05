-- Update the progression_levels_new view to include auto-claimed information
CREATE OR REPLACE VIEW progression_levels_new AS
WITH referral_data AS (
    SELECT 
        r.referred_uuid,
        r.user_uuid AS referral_uuid,
        vs.level,
        COUNT(vs.id) FILTER (WHERE vs.invested = TRUE) AS active_count,
        rc.claimed_by IS NOT NULL AS is_claimed,
        rc.auto_claimed
    FROM 
        referrals r
    JOIN 
        vesting_schedules vs ON r.referred_uuid = vs.user_uuid
    LEFT JOIN 
        referral_claims rc ON r.referred_uuid = rc.referred_uuid 
                          AND vs.level::text = rc.level::text 
                          AND r.user_uuid = rc.claimed_by
    GROUP BY 
        r.referred_uuid, r.user_uuid, vs.level, is_claimed, rc.auto_claimed
)
SELECT 
    rd.referred_uuid,
    rd.referral_uuid,
    MAX(CASE WHEN rd.level = 1 THEN rd.active_count || '/5' ELSE NULL END) AS level_1,
    MAX(CASE WHEN rd.level = 2 THEN rd.active_count || '/5' ELSE NULL END) AS level_2,
    MAX(CASE WHEN rd.level = 3 THEN rd.active_count || '/5' ELSE NULL END) AS level_3,
    MAX(CASE WHEN rd.level = 1 THEN 
        CASE 
            WHEN rd.is_claimed THEN 'claimed'
            WHEN rd.active_count >= 5 THEN 'claimable'
            ELSE 'Locked'
        END
        ELSE NULL END) AS button_state_lvl_1,
    MAX(CASE WHEN rd.level = 2 THEN 
        CASE 
            WHEN rd.is_claimed THEN 'claimed'
            WHEN rd.active_count >= 5 THEN 'claimable'
            ELSE 'Locked'
        END
        ELSE NULL END) AS button_state_lvl_2,
    MAX(CASE WHEN rd.level = 3 THEN 
        CASE 
            WHEN rd.is_claimed THEN 'claimed'
            WHEN rd.active_count >= 5 THEN 'claimable'
            ELSE 'Locked'
        END
        ELSE NULL END) AS button_state_lvl_3,
    MAX(CASE WHEN rd.level = 1 THEN rd.auto_claimed ELSE NULL END) AS auto_claimed_lvl_1,
    MAX(CASE WHEN rd.level = 2 THEN rd.auto_claimed ELSE NULL END) AS auto_claimed_lvl_2,
    MAX(CASE WHEN rd.level = 3 THEN rd.auto_claimed ELSE NULL END) AS auto_claimed_lvl_3
FROM 
    referral_data rd
GROUP BY 
    rd.referred_uuid, rd.referral_uuid;
