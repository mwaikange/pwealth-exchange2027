"use server"

import { createClient } from "@/lib/supabase-server"

export async function resetVestingSchedulesAndProcessClaims(userUuid: string, level: number) {
  try {
    console.log(`Server action: Resetting vesting schedules for user ${userUuid}, level ${level}`)

    // Create the Supabase client with explicit URL and key
    const supabase = createClient()

    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { success: false, error: "Failed to create Supabase client" }
    }

    // Only reset the vesting schedules - no dependency on referral_claims
    const { data: resetData, error: resetError } = await supabase.rpc("reset_schedules_by_level", {
      p_user_uuid: userUuid,
      p_level: level,
    })

    if (resetError) {
      console.error("Error resetting schedules:", resetError)
      return { success: false, error: resetError.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in resetVestingSchedulesAndProcessClaims:", error)
    return { success: false, error }
  }
}
