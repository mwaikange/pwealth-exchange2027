import { supabase } from "@/lib/supabaseClient"

// Update the register function in lib/auth.ts to handle optional referrer email

export async function register(name: string, email: string, password: string, referrerEmail?: string) {
  try {
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error("User creation failed")
    }

    // Generate a unique display ID
    const displayId = generateDisplayId()

    // Create the user profile in the app_users table
    const { error: profileError } = await supabase.from("app_users").insert({
      user_uuid: authData.user.id,
      email: email,
      display_id: displayId,
      name: name,
    })

    if (profileError) {
      throw new Error(profileError.message)
    }

    // Generate a referral code
    const referralCode = generateReferralCode()

    // Create user settings
    const { error: settingsError } = await supabase.from("usersettings").insert({
      user_uuid: authData.user.id,
      display_id: displayId,
      referral_code: referralCode,
    })

    if (settingsError) {
      throw new Error(settingsError.message)
    }

    // If referrerEmail is provided, create a referral record
    if (referrerEmail && referrerEmail.trim() !== "") {
      // Check if the referrer exists
      const { data: referrer, error: referrerError } = await supabase
        .from("app_users")
        .select("user_uuid")
        .eq("email", referrerEmail)
        .single()

      if (!referrerError && referrer) {
        // Create the referral record
        await supabase.from("referrals").insert({
          user_uuid: authData.user.id,
          referrer_email: referrerEmail,
        })
      }
      // If referrer doesn't exist, we still proceed with registration
      // The user can update the referrer later in settings
    }

    return authData.user
  } catch (error: any) {
    console.error("Registration error:", error)
    throw new Error(error.message || "Registration failed")
  }
}

// Helper functions
function generateDisplayId() {
  // Generate a random 8-character alphanumeric string
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

function generateReferralCode() {
  // Generate a random 6-character alphanumeric string
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
