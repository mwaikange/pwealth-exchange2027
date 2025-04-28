"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

export async function updateReferrer(formData: FormData) {
  const referrerEmail = formData.get("referrerEmail") as string
  // Get the session token and user ID from the form data
  const sessionToken = formData.get("sessionToken") as string
  const userId = formData.get("userId") as string

  try {
    console.log("Updating referrer for user:", userId)

    if (!sessionToken || !userId) {
      console.error("Missing session token or user ID in updateReferrer")
      return { success: false, message: "Authentication required. Please log in again." }
    }

    if (!referrerEmail?.trim()) {
      return { success: false, message: "Referrer email is required" }
    }

    // Create a new Supabase client with the service role key
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

    // Check if the user already has a referrer
    const { data: existingReferral } = await supabase.from("referrals").select("*").eq("referred_uuid", userId).single()

    if (existingReferral) {
      return { success: false, message: "You already have a referrer and cannot change it" }
    }

    // Check if the referrer exists
    const { data: referrer } = await supabase
      .from("app_users")
      .select("user_uuid, referral_code, email")
      .eq("email", referrerEmail)
      .single()

    if (!referrer) {
      return { success: false, message: "Referrer email not found" }
    }

    // Update the user's referrer_email in app_users
    const { error: updateError } = await supabase
      .from("app_users")
      .update({ referrer_email: referrerEmail })
      .eq("user_uuid", userId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Update the user's referral_code in usersettings
    const { error: settingsError } = await supabase
      .from("usersettings")
      .update({
        referral_code: referrer.referral_code,
        updated_at: new Date().toISOString(),
      })
      .eq("user_uuid", userId)

    if (settingsError) {
      throw new Error(settingsError.message)
    }

    // Get the user's country
    const { data: userData } = await supabase
      .from("app_users")
      .select("email, country")
      .eq("user_uuid", userId)
      .single()

    if (!userData) {
      return { success: false, message: "User data not found" }
    }

    // Create a new referral record
    const { error: referralError } = await supabase.from("referrals").insert({
      user_uuid: referrer.user_uuid,
      referred_uuid: userId,
      referrer_email: referrerEmail,
      referred_email: userData.email,
      referral_date: new Date().toISOString(),
      status: "pending", // Start as pending
      referred_referral_code: referrer.referral_code,
      country: userData.country || "Unknown", // Include country
      claimed: false,
      claim_date: null,
      active_count: 0, // Initialize with 0 active vesting schedules
    })

    if (referralError) {
      throw new Error(referralError.message)
    }

    revalidatePath("/dashboard/settings")
    return { success: true, message: "Referrer updated successfully" }
  } catch (error: any) {
    console.error("Error updating referrer:", error)
    return { success: false, message: error.message || "Failed to update referrer" }
  }
}
