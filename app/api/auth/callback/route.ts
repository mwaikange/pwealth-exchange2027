import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  // Handle error case
  if (error) {
    console.error("Auth error:", error, errorDescription)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url))
  }

  if (code) {
    try {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Session exchange error:", error.message)
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
      }

      // Successful authentication, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url))
    } catch (err: any) {
      console.error("Callback error:", err.message)
      return NextResponse.redirect(
        new URL(`/login?error=Unexpected error: ${encodeURIComponent(err.message)}`, request.url),
      )
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL("/login?error=No authentication code provided", request.url))
}
