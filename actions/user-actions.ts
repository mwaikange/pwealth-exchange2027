"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import { serverEnv } from "@/lib/env"

// Create admin client for privileged operations
const createAdminClient = () => {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function updatePassword(userId: string, newPassword: string) {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) {
      console.error("Error updating password:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in updatePassword:", error)
    return { success: false, error: "Failed to update password" }
  }
}

export async function updateReferrerEmail(userId: string, referrerEmail: string) {
  try {
    const supabase = createServerSupabaseClient()

    // First, find the referrer by email
    const { data: referrerData, error: referrerError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", referrerEmail)
      .single()

    if (referrerError || !referrerData) {
      return { success: false, error: "Referrer not found" }
    }

    // Update the user's referrer
    const { data, error } = await supabase.from("profiles").update({ referrer_id: referrerData.id }).eq("id", userId)

    if (error) {
      console.error("Error updating referrer:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in updateReferrerEmail:", error)
    return { success: false, error: "Failed to update referrer" }
  }
}

export async function getUserProfile(userId: string) {
  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) {
      console.error("Error fetching user profile:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in getUserProfile:", error)
    return { success: false, error: "Failed to fetch user profile" }
  }
}

export async function updateUserReferrer(userId: string, referrerId: string) {
  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase.from("profiles").update({ referrer_id: referrerId }).eq("id", userId)

    if (error) {
      console.error("Error updating user referrer:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in updateUserReferrer:", error)
    return { success: false, error: "Failed to update referrer" }
  }
}

export async function getUserStats(userId: string) {
  try {
    const supabase = createServerSupabaseClient()

    // Get user's basic stats
    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    // Get referral count
    const { count: referralCount, error: referralError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", userId)

    if (referralError) {
      console.warn("Error fetching referral count:", referralError)
    }

    return {
      success: true,
      data: {
        profile,
        referralCount: referralCount || 0,
      },
    }
  } catch (error) {
    console.error("Error in getUserStats:", error)
    return { success: false, error: "Failed to fetch user stats" }
  }
}
