-- Create a function to invest in a schedule
CREATE OR REPLACE FUNCTION public.invest_in_schedule(
  p_schedule_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_uuid UUID;
  v_schedule_exists BOOLEAN;
  v_is_activated BOOLEAN;
  v_is_invested BOOLEAN;
BEGIN
  -- Check if the schedule exists
  SELECT EXISTS(
    SELECT 1 FROM vesting_schedules 
    WHERE schedule_id = p_schedule_id
  ) INTO v_schedule_exists;
  
  IF NOT v_schedule_exists THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Schedule does not exist'
    );
  END IF;
  
  -- Get user_uuid for the schedule
  SELECT user_uuid INTO v_user_uuid
  FROM vesting_schedules
  WHERE schedule_id = p_schedule_id;
  
  -- Check if the schedule is activated
  SELECT activated INTO v_is_activated
  FROM vesting_schedules
  WHERE schedule_id = p_schedule_id;
  
  IF NOT v_is_activated THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Schedule is not activated'
    );
  END IF;
  
  -- Check if the schedule is already invested
  SELECT invested INTO v_is_invested
  FROM vesting_schedules
  WHERE schedule_id = p_schedule_id;
  
  IF v_is_invested THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Schedule is already invested'
    );
  END IF;
  
  -- Update the schedule to mark it as invested and set the start time
  UPDATE vesting_schedules
  SET 
    invested = TRUE,
    start_time = p_start_time
  WHERE schedule_id = p_schedule_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Schedule invested successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
