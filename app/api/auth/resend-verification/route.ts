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

    console.log("Resend verification requested for:", email)

    // Use the admin API to list users with the email filter
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      filter: `email.eq.${email}`,
    })

    if (error) {
      console.error("Error listing users:", error)
      return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }

    // Check if user exists
    if (!data?.users?.length) {
      console.log("User not found:", email)
      return NextResponse.json({ message: "User does not exist. Register now." }, { status: 404 })
    }

    const user = data.users[0]
    console.log("User found:", user.id, "Email confirmed:", !!user.email_confirmed_at)

    // Always resend verification email, even if already confirmed
    console.log("Resending verification email to:", email)
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peer-wealth.com"}/auth/callback?redirect_to=https://www.peer-wealth.com/verification-success`,
      },
    })

    if (resendError) {
      console.error("Error resending email:", resendError)
      return NextResponse.json({ message: "Failed to resend verification email." }, { status: 500 })
    }

    console.log("Verification email sent successfully to:", email)
    return NextResponse.json({ message: "Verification email has been sent. Please check your inbox." }, { status: 200 })
  } catch (err: any) {
    console.error("Unexpected error:", err)
    return NextResponse.json({ message: "Unexpected server error." }, { status: 500 })
  }
}
