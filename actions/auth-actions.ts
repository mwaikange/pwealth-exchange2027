"use server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export async function registerUser(formData: FormData) {
  console.log("Starting registration process...")

  try {
    console.log("Creating Supabase client...")
    const supabase = await createServerSupabaseClient()

    if (!supabase) {
      console.error("Failed to create Supabase client")
      throw new Error("Authentication service unavailable")
    }

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const referrerEmail = (formData.get("referrerEmail") as string) || null
    const country = (formData.get("country") as string) || null

    console.log("Registration data received:", {
      email,
      passwordLength: password?.length || 0,
      referrerEmail: referrerEmail || "None provided",
      country,
    })

    // FIXED: Properly format the redirect URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peer-wealth.com"
    // Remove any trailing slashes and the environment variable prefix
    const cleanSiteUrl = siteUrl.replace(/\/$/, "").replace(/^NEXT_PUBLIC_SITE_URL=/, "")
    const redirectTo = `${cleanSiteUrl}/api/auth/callback`

    console.log("Redirect URL:", redirectTo)

    // 1. Sign up using Supabase Auth
    console.log("Attempting to sign up user with Supabase Auth...")
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (authError) {
      console.error("Auth error:", authError)
      throw new Error(`Authentication error: ${authError.message}`)
    }

    if (!authData?.user) {
      console.error("User creation failed - no user returned")
      throw new Error("User creation failed - no user returned from auth service")
    }

    console.log("User created successfully in Auth:", authData.user.id)

    const user = authData.user
    const displayId = generateDisplayId()
    const referralCode = generateReferralCode()

    console.log("Generated displayId:", displayId)
    console.log("Generated referralCode:", referralCode)

    // 2. Insert into app_users
    console.log("Inserting user into app_users table...")
    const { error: appUserError } = await supabase.from("app_users").insert([
      {
        user_uuid: user.id,
        email,
        display_id: displayId,
        created_at: new Date().toISOString(),
        status: "active",
        country,
        referrer_email: referrerEmail || null,
        referral_code: referralCode,
      },
    ])

    if (appUserError) {
      console.error("App user error:", appUserError)
      // If we fail here, we should clean up the auth user
      try {
        await supabase.auth.admin.deleteUser(user.id)
        console.log("Cleaned up auth user after app_users insertion failure")
      } catch (cleanupError) {
        console.error("Failed to clean up auth user:", cleanupError)
      }
      throw new Error(`App user error: ${appUserError.message}`)
    }

    console.log("User inserted into app_users successfully")

    // 3. Insert into usersettings
    console.log("Inserting user settings...")
    const { error: settingsError } = await supabase.from("usersettings").insert([
      {
        user_uuid: user.id,
        referral_code: referralCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])

    if (settingsError) {
      console.error("Settings error:", settingsError)
      // If we fail here, we should clean up previous insertions
      try {
        await supabase.from("app_users").delete().eq("user_uuid", user.id)
        await supabase.auth.admin.deleteUser(user.id)
        console.log("Cleaned up after usersettings insertion failure")
      } catch (cleanupError) {
        console.error("Failed to clean up after usersettings error:", cleanupError)
      }
      throw new Error(`Settings error: ${settingsError.message}`)
    }

    console.log("User settings inserted successfully")

    // 4. If referrerEmail is provided, look up their referral_code and create referral
    if (referrerEmail?.trim()) {
      console.log("Looking up referrer information for:", referrerEmail)

      const { data: referrer, error: referrerError } = await supabase
        .from("app_users")
        .select("user_uuid, referral_code")
        .eq("email", referrerEmail)
        .maybeSingle()

      if (referrerError) {
        console.error("Error looking up referrer:", referrerError)
        // Continue with registration even if referrer lookup fails
      }

      if (referrer) {
        const referrerUuid = referrer.user_uuid
        const referrerReferralCode = referrer.referral_code
        console.log("Found referrer:", { referrerUuid, referrerReferralCode })

        // Create referral record
        console.log("Creating referral record...")
        const { error: referralError } = await supabase.from("referrals").insert([
          {
            user_uuid: referrerUuid,
            referred_uuid: user.id,
            referrer_email: referrerEmail,
            referred_email: email,
            referral_code: referrerReferralCode,
            referred_referral_code: referralCode,
            referral_date: new Date().toISOString(),
            status: "pending",
            display_id: displayId,
            claimed: false,
            claim_date: null,
          },
        ])

        if (referralError) {
          console.error("Referral creation error:", referralError)
          // Continue with registration even if referral creation fails
        } else {
          console.log("Referral record created successfully")
        }
      } else {
        console.log("No referrer found with email:", referrerEmail)
      }
    }

    // 5. Create vesting schedules
    console.log("Creating vesting schedules...")
    const vestingSchedules = Array.from({ length: 15 }).map((_, index) => {
      const level = Math.ceil((index + 1) / 5) // 1,2,3
      const positionIndex = index % 5
      const positions = ["A", "B", "C", "D", "E"]
      const position = positions[positionIndex]

      return {
        user_uuid: user.id,
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

    if (vestingError) {
      console.error("Vesting schedule error:", vestingError)
      // If we fail here, we should clean up previous insertions
      try {
        await supabase.from("referrals").delete().eq("referred_uuid", user.id)
        await supabase.from("usersettings").delete().eq("user_uuid", user.id)
        await supabase.from("app_users").delete().eq("user_uuid", user.id)
        await supabase.auth.admin.deleteUser(user.id)
        console.log("Cleaned up after vesting schedules insertion failure")
      } catch (cleanupError) {
        console.error("Failed to clean up after vesting error:", cleanupError)
      }
      throw new Error(`Vesting schedule error: ${vestingError.message}`)
    }

    console.log("Vesting schedules created successfully")
    console.log("Registration process completed successfully")

    // Registration successful, redirect to verification page
    return {
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
      email: email,
    }
  } catch (error: any) {
    console.error("Registration error:", error)
    return { success: false, message: error.message || "Registration failed" }
  }
}

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    const supabase = await createServerSupabaseClient()

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
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Sign out error:", error)
      throw error
    }
  } catch (error) {
    console.error("Sign out failed:", error)
    throw error
  }

  redirect("/login")
}

export async function getUser() {
  const supabase = createServerSupabaseClient()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("Get user error:", error)
      return null
    }

    return user
  } catch (error) {
    console.error("Get user failed:", error)
    return null
  }
}

// Helper functions
function generateDisplayId() {
  return `USR-${Math.floor(1000000 + Math.random() * 9000000)}`
}

function generateReferralCode() {
  return `REF-${Math.floor(1000000 + Math.random() * 9000000)}`
}
