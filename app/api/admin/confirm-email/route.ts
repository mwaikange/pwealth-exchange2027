import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

export async function POST(request: NextRequest) {
  try {
    // Create the Supabase client INSIDE the function so it runs at request time
    const adminSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || "", {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }
    console.log(`Attempting to confirm email for: ${email}`)
    
    // First, get the user
    const { data: user, error: userError } = await adminSupabase.auth.admin.getUserByEmail(email)
    if (userError || !user) {
      console.error("Error finding user:", userError)
      return NextResponse.json({ error: userError?.message || "User not found" }, { status: 404 })
    }
    console.log("Found user:", user.id)
    
    // Update the user to confirm their email
    const { data, error } = await adminSupabase.auth.admin.updateUserById(user.id, { email_confirm: true })
    if (error) {
      console.error("Error confirming email:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    console.log("Email confirmed successfully:", data)
    
    return NextResponse.json({
      success: true,
      message: `Email ${email} confirmed successfully`,
      user: data,
    })
  } catch (err: any) {
    console.error("Unexpected error in confirm-email:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
