"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

// Update user password
export async function updatePassword(formData: FormData) {
  const oldPassword = formData.get("oldPassword") as string
  const newPassword = formData.get("newPassword") as string
  const sessionToken = formData.get("sessionToken") as string
  const userId = formData.get("userId") as string

  try {
    console.log("Updating password for user:", userId)

    if (!sessionToken || !userId) {
      console.error("Missing session token or user ID")
      return { success: false, message: "Authentication required. Please log in again." }
    }

    // Create a new Supabase client with the session token
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

    // Update the password directly using the service role
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) {
      console.error("Password update error:", error.message)
      throw new Error(error.message)
    }

    revalidatePath("/dashboard/settings")
    return { success: true, message: "Password updated successfully" }
  } catch (error: any) {
    console.error("Password update error:", error.message)
    return { success: false, message: error.message || "Failed to update password" }
  }
}

// Update referrer email
export async function updateReferrerEmail(formData: FormData) {
  const referrerEmail = formData.get("referrerEmail") as string
  const sessionToken = formData.get("sessionToken") as string
  const userId = formData.get("userId") as string

  try {
    console.log("Updating referrer for user:", userId)

    if (!sessionToken || !userId) {
      console.error("Missing session token or user ID")
      return { success: false, message: "Authentication required. Please log in again." }
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

    // Get user display ID
    const { data: userData } = await supabase
      .from("app_users")
      .select("display_id, email")
      .eq("user_uuid", userId)
      .single()

    if (!userData) {
      return { success: false, message: "User data not found" }
    }

    // Create the referral
    const { error } = await supabase.from("referrals").insert({
      user_uuid: referrer.user_uuid,
      referred_uuid: userId,
      referrer_email: referrerEmail,
      referred_email: userData.email,
      referral_date: new Date().toISOString(),
      status: "active",
      display_id: userData.display_id,
      referral_code: referrer.referral_code,
    })

    if (error) throw new Error(error.message)

    revalidatePath("/dashboard/settings")
    return { success: true, message: "Referrer updated successfully" }
  } catch (error: any) {
    console.error("Referrer update error:", error.message)
    return { success: false, message: error.message || "Failed to update referrer" }
  }
}
