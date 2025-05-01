import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { env } from "@/lib/env"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const token = requestUrl.searchParams.get("token")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")
  const type = requestUrl.searchParams.get("type") || ""
  const redirectTo = requestUrl.searchParams.get("redirect_to") || "/verification-success"

  // Get the base URL from the request or use the NEXT_PUBLIC_SITE_URL
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || `${requestUrl.protocol}//${requestUrl.host}`

  // Create absolute URL for redirection
  const absoluteRedirectUrl = redirectTo.startsWith("http")
    ? redirectTo
    : `${baseUrl}${redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`}`

  console.log("Auth callback received:", {
    code,
    token,
    type,
    error,
    errorDescription,
    redirectTo,
    absoluteRedirectUrl,
    url: request.url,
  })

  // Handle error case
  if (error) {
    console.error("Auth error:", error, errorDescription)
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  try {
    // Create a Supabase client for handling the code exchange
    const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // We'll set cookies in the response later
        },
        remove(name: string, options: any) {
          // We'll remove cookies in the response later
        },
      },
    })

    // If we have a code, exchange it for a session
    if (code) {
      console.log("Exchanging code for session...")
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Session exchange error:", error.message)
        return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error.message)}`)
      }

      console.log("Code exchanged successfully!", data)

      // Create response with redirect
      const res = NextResponse.redirect(absoluteRedirectUrl)

      // If we have session data, set the cookies
      if (data?.session) {
        const { session } = data

        // Set auth cookie
        res.cookies.set("sb-access-token", session.access_token, {
          path: "/",
          maxAge: session.expires_in,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        })

        res.cookies.set("sb-refresh-token", session.refresh_token, {
          path: "/",
          maxAge: session.expires_in,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        })
      }

      return res
    }

    // If we have a token for email confirmation
    else if (token && type === "signup") {
      console.log("Processing email confirmation token...")

      // For email confirmations with token, we need to verify the email
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "email",
      })

      if (error) {
        console.error("Token verification error:", error.message)
        return NextResponse.redirect(
          `${baseUrl}/login?error=Email verification failed: ${encodeURIComponent(error.message)}`,
        )
      }

      console.log("Email confirmed successfully!", data)

      // Create response with redirect
      const res = NextResponse.redirect(absoluteRedirectUrl)

      // If we have session data, set the cookies
      if (data?.session) {
        const { session } = data

        // Set auth cookie
        res.cookies.set("sb-access-token", session.access_token, {
          path: "/",
          maxAge: session.expires_in,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        })

        res.cookies.set("sb-refresh-token", session.refresh_token, {
          path: "/",
          maxAge: session.expires_in,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        })
      }

      return res
    }

    // No token or code, just redirect
    console.log("No token or code, redirecting to:", absoluteRedirectUrl)
    return NextResponse.redirect(absoluteRedirectUrl)
  } catch (err: any) {
    console.error("Callback error:", err.message)
    return NextResponse.redirect(`${baseUrl}/login?error=Unexpected error: ${encodeURIComponent(err.message)}`)
  }
}
