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

    // Get the referrer's information
    let referrerQuery = supabase.from("app_users").select("user_uuid, email")

    // Determine if input is an email or referral code
    if (referrerEmail.includes("@")) {
      referrerQuery = referrerQuery.eq("email", referrerEmail)
    } else {
      // If not an email, try to find by referral code
      const { data: referrerByCode } = await supabase
        .from("usersettings")
        .select("user_uuid")
        .eq("referral_code", referrerEmail)
        .single()

      if (referrerByCode) {
        referrerQuery = supabase.from("app_users").select("user_uuid, email").eq("user_uuid", referrerByCode.user_uuid)
      } else {
        return { success: false, message: "Referrer not found with the provided referral code" }
      }
    }

    const { data: referrer, error: referrerError } = await referrerQuery.single()

    if (referrerError || !referrer) {
      console.error("Referrer not found:", referrerError)
      return { success: false, message: "Referrer email or code not found" }
    }

    // Get referrer's referral code
    const { data: referrerSettings, error: referrerSettingsError } = await supabase
      .from("usersettings")
      .select("referral_code")
      .eq("user_uuid", referrer.user_uuid)
      .single()

    if (referrerSettingsError || !referrerSettings) {
      console.error("Referrer settings not found:", referrerSettingsError)
      return { success: false, message: "Referrer settings not found" }
    }

    // Get user's information
    const { data: userData, error: userError } = await supabase
      .from("app_users")
      .select("display_id, email")
      .eq("user_uuid", userId)
      .single()

    if (userError || !userData) {
      console.error("User data not found:", userError)
      return { success: false, message: "User data not found" }
    }

    // Get user's referral code
    const { data: userSettings, error: userSettingsError } = await supabase
      .from("usersettings")
      .select("referral_code")
      .eq("user_uuid", userId)
      .single()

    if (userSettingsError || !userSettings) {
      console.error("User settings not found:", userSettingsError)
      return { success: false, message: "User settings not found" }
    }

    // Create the referral with both referral codes
    const { error } = await supabase.from("referrals").insert({
      user_uuid: referrer.user_uuid,
      referred_uuid: userId,
      referrer_email: referrer.email,
      referred_email: userData.email,
      referral_date: new Date().toISOString(),
      status: "active",
      display_id: userData.display_id,
      referral_code: referrerSettings.referral_code,
      referred_referral_code: userSettings.referral_code,
    })

    if (error) {
      console.error("Error creating referral:", error)
      throw new Error(error.message)
    }

    revalidatePath("/dashboard/settings")
    return { success: true, message: "Referrer updated successfully" }
  } catch (error: any) {
    console.error("Referrer update error:", error.message)
    return { success: false, message: error.message || "Failed to update referrer" }
  }
}

// Get user profile
export async function getUserProfile(userId: string) {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    const { data, error } = await supabase.from("app_users").select("*").eq("user_uuid", userId).single()

    if (error) {
      console.error("Get user profile error:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Get user profile failed:", error)
    throw error
  }
}

// Update user referrer
export async function updateUserReferrer(userId: string, referrerCode: string) {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    const { data, error } = await supabase
      .from("app_users")
      .update({ referrer_code: referrerCode })
      .eq("user_uuid", userId)
      .select()
      .single()

    if (error) {
      console.error("Update referrer error:", error)
      throw error
    }

    revalidatePath("/dashboard/settings")
    return data
  } catch (error) {
    console.error("Update referrer failed:", error)
    throw error
  }
}

// Get user stats
export async function getUserStats(userId: string) {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    // Get user's referral count
    const { count: referralCount, error: referralError } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("user_uuid", userId)

    if (referralError) {
      console.error("Get referral count error:", referralError)
    }

    // Get user's transaction count
    const { count: transactionCount, error: transactionError } = await supabase
      .from("payment_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    if (transactionError) {
      console.error("Get transaction count error:", transactionError)
    }

    return {
      referralCount: referralCount || 0,
      transactionCount: transactionCount || 0,
    }
  } catch (error) {
    console.error("Get user stats failed:", error)
    return {
      referralCount: 0,
      transactionCount: 0,
    }
  }
}
