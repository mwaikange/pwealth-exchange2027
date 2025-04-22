"use server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function registerUser(formData: FormData) {
  const supabase = createServerSupabaseClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const referrerEmail = (formData.get("referrerEmail") as string) || null
  const country = (formData.get("country") as string) || null // Store full country name

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

    // If referrerEmail is provided, look up their referral_code
    let referrerReferralCode = null
    let referrerUuid = null

    if (referrerEmail?.trim()) {
      const { data: referrer } = await supabase
        .from("app_users")
        .select("user_uuid, referral_code")
        .eq("email", referrerEmail)
        .maybeSingle()

      if (referrer) {
        referrerReferralCode = referrer.referral_code
        referrerUuid = referrer.user_uuid
      }
    }

    // 2. Insert into app_users
    const { error: appUserError } = await supabase.from("app_users").insert([
      {
        user_uuid: user.id,
        email,
        display_id: displayId,
        created_at: new Date().toISOString(),
        status: "active",
        country, // Store full country name
        referrer_email: referrerEmail || null,
        referral_code: referralCode, // User's own referral code
      },
    ])
    if (appUserError) throw new Error(appUserError.message)

    // 3. Insert into usersettings - FIXED: removed display_id field
    const { error: settingsError } = await supabase.from("usersettings").insert([
      {
        user_uuid: user.id,
        referral_code: referralCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    if (settingsError) throw new Error(settingsError.message)

    // 4. Create initial balances - FIXED: removed created_at field
    // The id column should have a default value set in the database (uuid_generate_v4())
    const { error: balanceError } = await supabase.from("balances").insert({
      user_uuid: user.id,
      display_id: displayId,
      pwt_invest_balance: 0,
      pwt_cashout_balance: 0,
      activation_fee_balance: 10, // Give them some starting tokens
      updated_at: new Date().toISOString(),
    })

    if (balanceError) throw new Error(`Balance creation error: ${balanceError.message}`)

    // 5. Insert referral if valid referrerEmail exists
    if (referrerEmail?.trim() && referrerUuid) {
      // Match the referrals table schema exactly, including display_id
      const { error: referralError } = await supabase.from("referrals").insert([
        {
          user_uuid: referrerUuid, // The referrer's UUID
          referred_uuid: user.id,
          referrer_email: referrerEmail,
          referred_email: email,
          referral_code: referrerReferralCode,
          referral_date: new Date().toISOString(),
          status: "pending",
          display_id: displayId, // FIXED: Added display_id for the referred user
          claimed: false,
          claim_date: null,
        },
      ])

      if (referralError) {
        console.error("Referral creation error:", referralError)
        // Continue with registration even if referral creation fails
      }
    }

    // 6. Create vesting schedules - FIXED: removed custom schedule_id
    const vestingSchedules = Array.from({ length: 15 }).map((_, index) => {
      const level = Math.ceil((index + 1) / 5) // 1,2,3
      const positionIndex = index % 5
      const positions = ["A", "B", "C", "D", "E"]
      const position = positions[positionIndex]

      return {
        user_uuid: user.id,
        // Let Postgres generate the UUID for schedule_id
        level,
        position,
        level_rank: index + 1,
        activated: false,
        invested: false,
        claimed: false,
        progress: 0,
        start_time: null,
        last_claim_time: null,
        last_claim_percentage: 0,
        prematurely_claimed: false,
        created_at: new Date().toISOString(),
      }
    })

    const { error: vestingError } = await supabase.from("vesting_schedules").insert(vestingSchedules)
    if (vestingError) throw new Error(`Vesting schedule error: ${vestingError.message}`)

    // Registration successful, redirect to verification page
    return {
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
      email: email, // Return email for redirect to verification page
    }
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
