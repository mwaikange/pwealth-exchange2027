-- Function to reset all schedules in a specific level for a user
-- This function has NO dependency on referral_claims
CREATE OR REPLACE FUNCTION reset_schedules_by_level(
  p_user_uuid UUID,
  p_level INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Log the start of the operation
  RAISE NOTICE 'Resetting all schedules in level % for user %', p_level, p_user_uuid;
  
  -- Update all schedules in the specified level for the user
  UPDATE vesting_schedules
  SET 
    activated = FALSE,
    invested = FALSE,
    claimed = FALSE,
    progress = 0,
    start_time = NULL,
    last_claim_time = NULL,
    last_claim_percentage = 0,
    prematurely_claimed = FALSE
  WHERE 
    user_uuid = p_user_uuid 
    AND level = p_level;
  
  -- Log the completion of the operation
  RAISE NOTICE 'Reset completed for level % for user %', p_level, p_user_uuid;
  
  -- Return success
  v_result := jsonb_build_object(
    'success', TRUE,
    'message', format('All schedules in level %s have been reset for user %s', p_level, p_user_uuid)
  );
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  RAISE NOTICE 'Error resetting schedules: %', SQLERRM;
  
  -- Return error
  v_result := jsonb_build_object(
    'success', FALSE,
    'error', SQLERRM
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reset_schedules_by_level(UUID, INTEGER) TO authenticated;
