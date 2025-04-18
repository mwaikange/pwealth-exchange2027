"use server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function registerUser(formData: FormData) {
  const supabase = createServerSupabaseClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string
  const referrerEmail = (formData.get("referrer") as string) || null

  try {
    // 1. Sign up using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      },
    })

    if (authError) throw new Error(authError.message)
    if (!authData.user) throw new Error("User creation failed")

    const user = authData.user
    const displayId = generateDisplayId()
    const referralCode = generateReferralCode()

    // 2. Insert into app_users
    const { error: appUserError } = await supabase.from("app_users").insert([
      {
        user_uuid: user.id,
        email,
        name,
        display_id: displayId,
        created_at: new Date().toISOString(),
        status: "active",
      },
    ])
    if (appUserError) throw new Error(appUserError.message)

    // 3. Insert into usersettings
    const { error: settingsError } = await supabase.from("usersettings").insert([
      {
        user_uuid: user.id,
        display_id: displayId,
        referral_code: referralCode,
        mfa_enabled: false,
      },
    ])
    if (settingsError) throw new Error(settingsError.message)

    // 4. Insert referral if valid referrerEmail exists
    if (referrerEmail?.trim()) {
      const { data: referrer, error: referrerError } = await supabase
        .from("app_users")
        .select("user_uuid")
        .eq("email", referrerEmail)
        .maybeSingle()

      if (!referrerError && referrer) {
        await supabase.from("referrals").insert([
          {
            user_uuid: user.id,
            referrer_uuid: referrer.user_uuid,
            referrer_email: referrerEmail,
            referred_email: email,
            referral_code: referralCode,
            referral_date: new Date().toISOString(),
          },
        ])
      }
    }

    // 5. Create initial balances
    await supabase.from("balances").insert({
      user_uuid: user.id,
      display_id: displayId,
      pwt_invest_balance: 0,
      pwt_cashout_balance: 0,
      activation_fee_balance: 10, // Give them some starting tokens
      updated_at: new Date().toISOString(),
    })

    // 6. Create vesting schedules
    const vestingSchedules = Array.from({ length: 15 }).map((_, index) => ({
      user_uuid: user.id,
      schedule_id: index + 1,
      level: `${Math.ceil((index + 1) / 5)}`, // 1,2,3
      status: "Unclaimed",
    }))

    const { error: vestingError } = await supabase.from("vesting_schedules").insert(vestingSchedules)
    if (vestingError) throw new Error(vestingError.message)

    return { success: true, message: "Registration successful! Please check your email to verify your account." }
  } catch (error: any) {
    console.error("Registration error:", error)
    return { success: false, message: error.message || "Registration failed" }
  }
}

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const supabase = createServerSupabaseClient()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { success: false, message: error.message }
    }

    return { success: true, user: data.user }
  } catch (error: any) {
    return { success: false, message: error.message || "Login failed" }
  }
}

export async function logoutUser() {
  const supabase = createServerSupabaseClient()

  try {
    await supabase.auth.signOut()
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Logout failed" }
  }
}

// Helper functions
function generateDisplayId() {
  return `USR-${Math.floor(1000000 + Math.random() * 9000000)}`
}

function generateReferralCode() {
  return `REF-${Math.floor(1000000 + Math.random() * 9000000)}`
}
