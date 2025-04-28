import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    // Get the referral code from the query parameters
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 })
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Look up the user with this referral code in app_users table
    const { data, error } = await supabase.from("app_users").select("email").eq("referral_code", code).single()

    if (error) {
      console.error("Error looking up referral code:", error)
      return NextResponse.json({ error: "Failed to look up referral code" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })
    }

    // Return the referrer's email
    return NextResponse.json({ email: data.email })
  } catch (error) {
    console.error("Error in referral lookup API:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
