"use server"

import { createClient } from "@/lib/supabase-server"
import { env } from "@/lib/env"

export async function resetVestingSchedulesAndProcessClaims(userUuid: string, level: number) {
  try {
    console.log(`Server action: Resetting vesting schedules for user ${userUuid}, level ${level}`)

    // Create the Supabase client with explicit URL and key
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { success: false, error: "Failed to create Supabase client" }
    }

    // First, directly reset the vesting schedules in the database
    const { data: resetData, error: resetError } = await supabase.rpc("reset_all_schedules_in_level", {
      p_user_uuid: userUuid,
      p_level: level,
    })

    if (resetError) {
      console.error("Error resetting schedules:", resetError)
      throw resetError
    }

    // Then process any referral claims that need to be reset or auto-claimed
    const { error: claimsError } = await supabase.rpc("reset_referral_claims_for_user", {
      p_referred_uuid: userUuid,
      p_level: level,
    })

    if (claimsError) {
      console.error("Error processing referral claims:", claimsError)
      throw claimsError
    }

    return { success: true }
  } catch (error) {
    console.error("Error in resetVestingSchedulesAndProcessClaims:", error)
    return { success: false, error }
  }
}
