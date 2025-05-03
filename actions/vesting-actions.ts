"use server"

import { createClient } from "@/lib/supabase-server"

export async function resetVestingSchedulesAndProcessClaims(userUuid: string, level: number) {
  const supabase = createClient()

  try {
    // First reset all vesting schedules in the level
    const { error: resetError } = await supabase.rpc("reset_all_schedules_in_level", {
      p_user_uuid: userUuid,
      p_level: level,
    })

    if (resetError) throw resetError

    // Then process any referral claims that need to be reset or auto-claimed
    const { error: claimsError } = await supabase.rpc("reset_referral_claims_for_user", {
      p_referred_uuid: userUuid,
      p_level: level,
    })

    if (claimsError) throw claimsError

    return { success: true }
  } catch (error) {
    console.error("Error resetting vesting schedules and processing claims:", error)
    return { success: false, error }
  }
}
