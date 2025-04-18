import { supabase } from "./supabase"

// LOG IN USER
export async function login(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { success: false, message: error.message }
    }

    return { success: true, user: data.user }
  } catch (error: any) {
    console.error("Login error:", error)
    return { success: false, message: error.message || "Login failed" }
  }
}

// REGISTER USER
export async function register(name: string, email: string, password: string, referrerEmail?: string) {
  try {
    // 1. Sign up using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) throw new Error(authError.message)
    if (!authData.user) throw new Error("User creation failed")

    const user = authData.user
    const displayId = generateDisplayId()
    const referralCode = generateReferralCode()

    // 2. Ensure user is authenticated (getSession required for RLS)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user?.id) throw new Error("Session not found after signup")

    const user_uuid = session.user.id

    // 3. Insert into app_users
    const { error: appUserError } = await supabase.from("app_users").insert([
      {
        user_uuid,
        email,
        name,
        display_id: displayId,
      },
    ])
    if (appUserError) throw new Error(appUserError.message)

    // 4. Insert into usersettings
    const { error: settingsError } = await supabase.from("usersettings").insert([
      {
        user_uuid,
        display_id: displayId,
        referral_code: referralCode,
      },
    ])
    if (settingsError) throw new Error(settingsError.message)

    // 5. Insert referral if valid referrerEmail exists
    if (referrerEmail?.trim()) {
      const { data: referrer, error: referrerError } = await supabase
        .from("app_users")
        .select("user_uuid")
        .eq("email", referrerEmail)
        .maybeSingle()

      if (!referrerError && referrer) {
        await supabase.from("referrals").insert([
          {
            user_uuid,
            referrer_email: referrerEmail,
            referred_email: email,
            referral_code: referralCode,
            referral_date: new Date().toISOString(),
          },
        ])
      }
    }

    // 6. Optionally: Pre-create empty vesting schedules
    const vestingSchedules = Array.from({ length: 15 }).map((_, index) => ({
      user_uuid,
      schedule_id: index + 1,
      level: `${Math.ceil((index + 1) / 5)}`, // 1,2,3
      status: "Unclaimed",
    }))

    const { error: vestingError } = await supabase.from("vesting_schedules").insert(vestingSchedules)
    if (vestingError) throw new Error(vestingError.message)

    return user
  } catch (error: any) {
    console.error("Registration error:", error)
    throw new Error(error.message || "Registration failed")
  }
}

// LOGOUT
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error("Logout error:", error)
    return { success: false, message: error.message }
  }
}

// Helpers
function generateDisplayId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
