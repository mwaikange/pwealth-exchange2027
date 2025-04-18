"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { success: false, message: error.message }
    }

    revalidatePath("/dashboard")
    redirect("/dashboard")

    return { success: true, message: "Login successful" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function logoutUser() {
  try {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      return { success: false, message: error.message }
    }

    revalidatePath("/login")
    redirect("/login")

    return { success: true, message: "Logout successful" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Add the registerUser function that was missing

// Add this function after the existing functions
export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const country = formData.get("country") as string
  const referrerEmail = formData.get("referrerEmail") as string

  try {
    const supabase = createServerSupabaseClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL}/api/auth/callback`,
      },
    })

    if (authError) throw new Error(authError.message)

    if (authData.user) {
      const userUuid = authData.user.id
      const displayId = `USR-${Math.floor(1000000 + Math.random() * 9000000)}`
      const referralCode = `RFRL-${Math.floor(3000000 + Math.random() * 1000000)}`

      // Insert into app_users table
      const { error: userError } = await supabase.from("app_users").insert({
        email,
        user_uuid: userUuid,
        display_id: displayId,
        country,
        referral_code: referralCode,
        created_at: new Date().toISOString(),
        status: "active",
      })

      if (userError) throw new Error(userError.message)

      // Initialize user balances
      const { error: balanceError } = await supabase.from("balances").insert({
        user_uuid: userUuid,
        display_id: displayId,
        pwt_invest_balance: 0,
        pwt_cashout_balance: 0,
        activation_fee_balance: 0,
        updated_at: new Date().toISOString(),
      })

      if (balanceError) throw new Error(balanceError.message)

      // Create user settings
      const { error: settingsError } = await supabase.from("usersettings").insert({
        user_uuid: userUuid,
        mfa_enabled: false,
        referral_code: referralCode,
      })

      if (settingsError) throw new Error(settingsError.message)

      // Handle referral if provided
      if (referrerEmail && referrerEmail.trim() !== "") {
        const { data: referrerData } = await supabase
          .from("app_users")
          .select("user_uuid, referral_code")
          .eq("email", referrerEmail)
          .single()

        if (referrerData) {
          await supabase.from("referrals").insert({
            user_uuid: referrerData.user_uuid,
            referred_uuid: userUuid,
            referrer_email: referrerEmail,
            referred_email: email,
            referral_date: new Date().toISOString(),
            status: "active",
            display_id: displayId,
            referral_code: referrerData.referral_code,
          })
        }
      }

      return { success: true, message: "Registration successful" }
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
