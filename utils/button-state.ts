// Utility function to determine button state for referral claims
export interface ButtonState {
  button_state: string
  button_text: string
  button_color: string
  text_color: string
  is_clickable: boolean
  progress_text: string
  reset_timer_seconds: number
}

export interface ReferralData {
  active_count: number
  claimed: boolean
  claim_date?: string | null
  level_reset?: boolean
  auto_claimed?: boolean
}

/**
 * Determines the button state for a referral based on its data
 *
 * @param referral The referral data
 * @returns The button state object
 */
export function determineButtonState(referral: ReferralData): ButtonState {
  const total_schedules = 5
  const active_count = Math.min(referral.active_count, total_schedules)

  // STATE 1: NOT CLAIMABLE/LOCKED
  if (active_count < total_schedules && !referral.claimed) {
    return {
      button_state: "locked",
      button_text: "locked",
      button_color: "grey",
      text_color: "white",
      is_clickable: false,
      progress_text: `${active_count}/${total_schedules}`,
      reset_timer_seconds: 0,
    }
  }

  // STATE 2: CLAIMABLE
  else if (active_count >= total_schedules && !referral.claimed) {
    return {
      button_state: "claimable",
      button_text: "claim",
      button_color: "white",
      text_color: "black",
      is_clickable: true,
      progress_text: `${total_schedules}/${total_schedules}`,
      reset_timer_seconds: 0,
    }
  }

  // STATE 3: CLAIMED (manually or automatically)
  else if (referral.claimed) {
    const buttonText = referral.auto_claimed ? "Auto-Claimed" : "Claimed"

    return {
      button_state: "claimed",
      button_text: buttonText,
      button_color: "grey",
      text_color: "green",
      is_clickable: false,
      progress_text: `${total_schedules}/${total_schedules}`,
      reset_timer_seconds: 0,
    }
  }

  // Fallback (should not happen, but just in case)
  else {
    return {
      button_state: "unknown",
      button_text: "error",
      button_color: "red",
      text_color: "white",
      is_clickable: false,
      progress_text: `?/${total_schedules}`,
      reset_timer_seconds: 0,
    }
  }
}
