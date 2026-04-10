"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function updateReferrer(formData: FormData) {
  const supabase = createServerSupabaseClient()

  try {
    const referrerEmail = formData.get("referrerEmail") as string
    const userId = formData.get("userId") as string
    const sessionToken = formData.get("sessionToken") as string

    if (!referrerEmail || !userId) {
      return { success: false, message: "Missing required fields" }
    }

    // First, find the referrer by email
    const { data: referrerData, error: referrerError } = await supabase
      .from("app_users")
      .select("user_uuid, email")
      .eq("email", referrerEmail)
      .single()

    if (referrerError || !referrerData) {
      return { success: false, message: "Referrer not found" }
    }

    // Get the referrer's referral code
    const { data: referrerSettings, error: settingsError } = await supabase
      .from("usersettings")
      .select("referral_code")
      .eq("user_uuid", referrerData.user_uuid)
      .single()

    if (settingsError || !referrerSettings) {
      return { success: false, message: "Referrer settings not found" }
    }

    // Check if user already has a referrer
    const { data: existingReferral, error: existingError } = await supabase
      .from("referrals")
      .select("*")
      .eq("referred_uuid", userId)
      .single()

    if (existingReferral) {
      return { success: false, message: "You already have a referrer" }
    }

    // Create the referral relationship
    const { data, error } = await supabase
      .from("referrals")
      .insert({
        referrer_uuid: referrerData.user_uuid,
        referrer_email: referrerData.email,
        referred_uuid: userId,
        referral_code: referrerSettings.referral_code,
        referred_referral_code: referrerSettings.referral_code,
      })
      .select()
      .single()

    if (error) {
      console.error("Referral creation error:", error)
      return { success: false, message: "Failed to create referral relationship" }
    }

    revalidatePath("/dashboard/settings")
    return { success: true, message: "Referrer updated successfully" }
  } catch (error) {
    console.error("Update referrer failed:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}
