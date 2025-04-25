-- Create a function to update referral active_count based on vesting schedules
CREATE OR REPLACE FUNCTION update_referral_active_count() RETURNS TRIGGER AS $$
BEGIN
  -- When a vesting schedule is updated to invested=true
  IF (NEW.invested = TRUE AND OLD.invested = FALSE) THEN
    -- Update the active_count in the referrals table
    UPDATE referrals
    SET active_count = active_count + 1
    WHERE referred_uuid = NEW.user_uuid;
    
    -- Check if active_count is now 5, if yes, update status to 'active'
    UPDATE referrals
    SET status = 'active'
    WHERE referred_uuid = NEW.user_uuid
    AND active_count >= 5;
  END IF;
  
  -- When a vesting schedule is reset (claimed and then reset)
  IF (NEW.invested = FALSE AND OLD.invested = TRUE) THEN
    -- Decrement the active_count
    UPDATE referrals
    SET active_count = GREATEST(active_count - 1, 0)
    WHERE referred_uuid = NEW.user_uuid;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call this function when vesting schedules are updated
DROP TRIGGER IF EXISTS update_referral_on_vesting_change ON vesting_schedules;
CREATE TRIGGER update_referral_on_vesting_change
AFTER UPDATE ON vesting_schedules
FOR EACH ROW
EXECUTE FUNCTION update_referral_active_count();
