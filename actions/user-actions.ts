"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

// Update user password
export async function updatePassword(formData: FormData) {
  const oldPassword = formData.get("oldPassword") as string
  const newPassword = formData.get("newPassword") as string

  try {
    const supabase = createServerSupabaseClient()

    // First, verify the user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: "You must be logged in to change your password" }
    }

    // Update the password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw new Error(error.message)

    revalidatePath("/dashboard/settings")
    return { success: true, message: "Password updated successfully" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Update referrer email
export async function updateReferrerEmail(formData: FormData) {
  const referrerEmail = formData.get("referrerEmail") as string

  try {
    const supabase = createServerSupabaseClient()

    // First, verify the user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: "You must be logged in to update referrer" }
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

    // Get user display ID
    const { data: userData } = await supabase
      .from("app_users")
      .select("display_id, email")
      .eq("user_uuid", user.id)
      .single()

    if (!userData) {
      return { success: false, message: "User data not found" }
    }

    // Create the referral
    const { error } = await supabase.from("referrals").insert({
      user_uuid: referrer.user_uuid,
      referred_uuid: user.id,
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
    return { success: false, message: error.message }
  }
}
