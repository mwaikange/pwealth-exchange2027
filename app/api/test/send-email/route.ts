import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create a Supabase client with the service role key for admin access
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Get email from request body
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    console.log("🔍 [TEST] Testing email sending to:", email)

    // Try all available methods to send an email
    const results = {
      resend: null as any,
      generateLink: null as any,
      inviteUserByEmail: null as any,
    }

    // Method 1: Resend
    try {
      console.log("🔍 [TEST] Method 1: Using auth.resend")
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peer-wealth.com"}/auth/callback?redirect_to=https://www.peer-wealth.com/verification-success`,
        },
      })

      results.resend = error ? { error: error.message } : { success: true }
      console.log("✅ [TEST] Method 1 result:", results.resend)
    } catch (err: any) {
      results.resend = { error: err.message }
      console.error("❌ [TEST] Method 1 error:", err)
    }

    // Method 2: Generate Link
    try {
      console.log("🔍 [TEST] Method 2: Using admin.generateLink")
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "signup",
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peer-wealth.com"}/auth/callback?redirect_to=https://www.peer-wealth.com/verification-success`,
        },
      })

      results.generateLink = error
        ? { error: error.message }
        : { success: true, emailSent: data.properties?.email_sent, hasLink: !!data.properties?.action_link }

      console.log("✅ [TEST] Method 2 result:", results.generateLink)
    } catch (err: any) {
      results.generateLink = { error: err.message }
      console.error("❌ [TEST] Method 2 error:", err)
    }

    // Method 3: Invite User
    try {
      console.log("🔍 [TEST] Method 3: Using admin.inviteUserByEmail")
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peer-wealth.com"}/auth/callback?redirect_to=https://www.peer-wealth.com/verification-success`,
      })

      results.inviteUserByEmail = error ? { error: error.message } : { success: true, user: data.user?.id }
      console.log("✅ [TEST] Method 3 result:", results.inviteUserByEmail)
    } catch (err: any) {
      results.inviteUserByEmail = { error: err.message }
      console.error("❌ [TEST] Method 3 error:", err)
    }

    return NextResponse.json(
      {
        message: "Test completed. Check server logs for details.",
        results,
      },
      { status: 200 },
    )
  } catch (err: any) {
    console.error("❌ [TEST] Unexpected error:", err)
    return NextResponse.json({ message: "Unexpected server error." }, { status: 500 })
  }
}
