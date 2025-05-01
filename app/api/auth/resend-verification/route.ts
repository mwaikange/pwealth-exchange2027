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

    console.log("🔍 [RESEND] Step 1: Resend verification requested for:", email)

    // Use the admin API to list users with the email filter
    console.log("🔍 [RESEND] Step 2: Checking if user exists in Supabase")
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      filter: `email.eq.${email}`,
    })

    if (error) {
      console.error("❌ [RESEND] Error listing users:", error)
      return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }

    // Check if user exists
    if (!data?.users?.length) {
      console.log("❌ [RESEND] User not found:", email)
      return NextResponse.json({ message: "User does not exist. Register now." }, { status: 404 })
    }

    const user = data.users[0]
    console.log("✅ [RESEND] Step 3: User found:", user.id, "Email confirmed:", !!user.email_confirmed_at)

    // Try using the direct admin API to send the email
    console.log("🔍 [RESEND] Step 4: Using admin.generateLink to send verification email")
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peer-wealth.com"}/auth/callback?redirect_to=https://www.peer-wealth.com/verification-success`,
      },
    })

    if (linkError) {
      console.error("❌ [RESEND] Error generating link:", linkError)

      // Fallback to the regular resend method
      console.log("🔍 [RESEND] Step 5: Fallback - Using auth.resend to send verification email")
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peer-wealth.com"}/auth/callback?redirect_to=https://www.peer-wealth.com/verification-success`,
        },
      })

      if (resendError) {
        console.error("❌ [RESEND] Error resending email:", resendError)
        return NextResponse.json({ message: "Failed to resend verification email." }, { status: 500 })
      }
    } else {
      console.log(
        "✅ [RESEND] Link generated successfully:",
        linkData.properties?.action_link ? "Link available" : "No link returned",
      )

      // If we have a link but want Supabase to send the email anyway
      if (!linkData.properties?.email_sent) {
        console.log("🔍 [RESEND] Step 6: Email not automatically sent, using resend as fallback")
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peer-wealth.com"}/auth/callback?redirect_to=https://www.peer-wealth.com/verification-success`,
          },
        })

        if (resendError) {
          console.error("❌ [RESEND] Error resending email:", resendError)
          return NextResponse.json({ message: "Failed to resend verification email." }, { status: 500 })
        }
      }
    }

    console.log("✅ [RESEND] Step 7: Verification email process completed for:", email)
    return NextResponse.json(
      { message: "Verification email has been sent. Please check your inbox and spam folder." },
      { status: 200 },
    )
  } catch (err: any) {
    console.error("❌ [RESEND] Unexpected error:", err)
    return NextResponse.json({ message: "Unexpected server error." }, { status: 500 })
  }
}
