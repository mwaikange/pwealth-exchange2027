-- Function to determine button state based on levels table
CREATE OR REPLACE FUNCTION get_referral_button_state(
  p_referred_uuid UUID,
  p_claimed BOOLEAN,
  p_claim_date TIMESTAMP WITHOUT TIME ZONE
)
RETURNS JSON AS $$
DECLARE
  v_level_count INTEGER;
  v_completed_levels INTEGER;
  v_total_levels INTEGER := 3; -- Total number of levels
  v_reset_timer INTEGER := 0;
  v_button_state JSON;
  v_level_reset BOOLEAN := FALSE;
BEGIN
  -- Count how many levels the user has
  SELECT COUNT(*) 
  INTO v_level_count
  FROM levels
  WHERE user_uuid = p_referred_uuid;
  
  -- Count completed levels (progress = 100)
  SELECT COUNT(*) 
  INTO v_completed_levels
  FROM levels
  WHERE user_uuid = p_referred_uuid AND progress = 100;
  
  -- Check if all levels are completed (level reset condition)
  IF v_completed_levels = v_level_count AND v_level_count > 0 THEN
    v_level_reset := TRUE;
  END IF;
  
  -- Calculate reset timer if applicable
  IF p_claimed AND p_claim_date IS NOT NULL AND v_level_reset THEN
    v_reset_timer := GREATEST(0, 10 - EXTRACT(EPOCH FROM (NOW() - p_claim_date))::INTEGER);
  END IF;
  
  -- STATE 1: NOT CLAIMABLE/LOCKED
  IF (v_completed_levels < v_total_levels AND NOT p_claimed) OR 
     (p_claimed AND v_level_reset AND v_reset_timer = 0) THEN
    v_button_state := json_build_object(
      'button_state', 'locked',
      'button_text', 'locked',
      'button_color', 'grey',
      'text_color', 'white',
      'is_clickable', FALSE,
      'progress_text', v_completed_levels || '/' || v_total_levels,
      'reset_timer_seconds', 0
    );
  
  -- STATE 2: CLAIMABLE
  ELSIF v_completed_levels >= v_total_levels AND NOT p_claimed THEN
    v_button_state := json_build_object(
      'button_state', 'claimable',
      'button_text', 'claim',
      'button_color', 'white',
      'text_color', 'black',
      'is_clickable', TRUE,
      'progress_text', v_total_levels || '/' || v_total_levels,
      'reset_timer_seconds', 0
    );
  
  -- STATE 3: CLAIMED (not reset yet)
  ELSIF p_claimed AND (NOT v_level_reset OR v_reset_timer > 0) THEN
    v_button_state := json_build_object(
      'button_state', 'claimed',
      'button_text', 'claimed',
      'button_color', 'grey',
      'text_color', 'green',
      'is_clickable', FALSE,
      'progress_text', v_total_levels || '/' || v_total_levels,
      'reset_timer_seconds', v_reset_timer
    );
  
  -- Fallback (should not happen)
  ELSE
    v_button_state := json_build_object(
      'button_state', 'unknown',
      'button_text', 'error',
      'button_color', 'red',
      'text_color', 'white',
      'is_clickable', FALSE,
      'progress_text', '?/' || v_total_levels,
      'reset_timer_seconds', 0
    );
  END IF;
  
  RETURN v_button_state;
END;
$$ LANGUAGE plpgsql;
