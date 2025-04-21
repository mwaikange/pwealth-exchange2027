"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

export async function updateReferrer(formData: FormData) {
  const referrerEmail = formData.get("referrerEmail") as string

  if (!referrerEmail?.trim()) {
    return { success: false, message: "Referrer email is required" }
  }

  try {
    const supabase = createServerSupabaseClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: "You must be logged in to update your referrer" }
    }

    // Check if the user already has a referrer
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("*")
      .eq("referred_uuid", user.id)
      .single()

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
      .eq("user_uuid", user.id)

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
      .eq("user_uuid", user.id)

    if (settingsError) {
      throw new Error(settingsError.message)
    }

    // Create a new referral record
    const { data: userData } = await supabase.from("app_users").select("email").eq("user_uuid", user.id).single()

    if (!userData) {
      return { success: false, message: "User data not found" }
    }

    const { error: referralError } = await supabase.from("referrals").insert({
      user_uuid: referrer.user_uuid,
      referred_uuid: user.id,
      referrer_email: referrerEmail,
      referred_email: userData.email,
      referral_date: new Date().toISOString(),
      status: "active",
      referral_code: referrer.referral_code,
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
