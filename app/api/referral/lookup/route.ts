import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    // Get the referral code from the query parameters
    const { searchParams } = new URL(request.url)
    const referralCode = searchParams.get("code")

    if (!referralCode) {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 })
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      cookies: () => cookies(),
    })

    // Look up the user with this referral code
    const { data: userData, error: userError } = await supabase
      .from("usersettings")
      .select("user_uuid")
      .eq("referral_code", referralCode)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })
    }

    // Get the user's email
    const { data: userEmail, error: emailError } = await supabase
      .from("app_users")
      .select("email")
      .eq("user_uuid", userData.user_uuid)
      .single()

    if (emailError || !userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 404 })
    }

    // Return the referrer's email
    return NextResponse.json({ email: userEmail.email })
  } catch (error) {
    console.error("Error looking up referral code:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
