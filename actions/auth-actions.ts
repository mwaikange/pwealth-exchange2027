"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { v4 as uuidv4 } from "uuid"

// Register a new user
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
        id: uuidv4(),
        user_uuid: userUuid,
        display_id: displayId,
        pwt_invest_balance: 30,
        pwt_cashout_balance: 30,
        activation_fee_balance: 30,
        updated_at: new Date().toISOString(),
      })

      if (balanceError) throw new Error(balanceError.message)

      // Create user settings
      const { error: settingsError } = await supabase.from("usersettings").insert({
        setting_id: uuidv4(),
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

// Login user
export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw new Error(error.message)

    if (data.user) {
      // Update last login time
      await supabase.from("app_users").update({ last_login: new Date().toISOString() }).eq("user_uuid", data.user.id)

      revalidatePath("/dashboard")
      redirect("/dashboard")
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Logout user
export async function logoutUser() {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
  revalidatePath("/")
  redirect("/login")
}
