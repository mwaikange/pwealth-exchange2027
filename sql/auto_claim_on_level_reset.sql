-- Function to automatically claim rewards when a level resets
CREATE OR REPLACE FUNCTION auto_claim_on_level_reset()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_uuid UUID;
    v_level INT;
    v_reward_amount INT;
    v_transaction_id UUID;
BEGIN
    -- Get the level that's being reset
    v_level := NEW.level;
    
    -- Find all referrers who have claimable but unclaimed rewards for this user at this level
    FOR v_referrer_uuid IN 
        SELECT referral_uuid 
        FROM progression_levels_new
        WHERE 
            referred_uuid = NEW.user_uuid
            AND (
                (v_level = 1 AND button_state_lvl_1 = 'claimable') OR
                (v_level = 2 AND button_state_lvl_2 = 'claimable') OR
                (v_level = 3 AND button_state_lvl_3 = 'claimable')
            )
    LOOP
        -- Set reward amount based on level
        v_reward_amount := v_level;
        
        -- Generate transaction ID
        v_transaction_id := gen_random_uuid();
        
        -- 1. Add PWT tokens to the referrer's cashout balance
        UPDATE balances
        SET 
            pwt_cashout_balance = pwt_cashout_balance + v_reward_amount,
            updated_at = NOW()
        WHERE user_uuid = v_referrer_uuid;
        
        -- 2. Record the transaction
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
            v_transaction_id,
            v_referrer_uuid,
            'REFERRAL CLAIM-LvL' || v_level,
            'PWT Cashout',
            v_reward_amount,
            v_reward_amount * 10, -- Assuming 1 PWT = $10 USD
            'AUTO-' || substring(v_transaction_id::text, 1, 8),
            'Auto-claimed referral reward (Level ' || v_level || ')',
            NOW()
        );
        
        -- 3. Record the claim in referral_claims
        INSERT INTO referral_claims (
            referred_uuid,
            level,
            claimed_by,
            auto_claimed,
            claim_reason
        ) VALUES (
            NEW.user_uuid,
            v_level,
            v_referrer_uuid,
            TRUE,
            'level_reset_auto_claim'
        );
        
        -- Log the auto-claim
        RAISE NOTICE 'Auto-claimed level % reward for referrer % from referred %', 
            v_level, v_referrer_uuid, NEW.user_uuid;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on vesting_schedules table
DROP TRIGGER IF EXISTS trigger_auto_claim_on_level_reset ON vesting_schedules;
CREATE TRIGGER trigger_auto_claim_on_level_reset
AFTER UPDATE OF reset_count ON vesting_schedules
FOR EACH ROW
WHEN (NEW.reset_count > OLD.reset_count)
EXECUTE FUNCTION auto_claim_on_level_reset();
