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

  console.log("Password reset callback received:", {
    code,
    token,
    type,
    error,
    errorDescription,
    url: request.url,
    fullUrl: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  })

  // Handle error case
  if (error) {
    console.error("Auth error:", error, errorDescription)
    return NextResponse.redirect(
      new URL(`/forgot-password?error=${encodeURIComponent(errorDescription || error)}`, request.url),
    )
  }

  // Create response object early so we can modify cookies
  const res = NextResponse.redirect(new URL("/reset-password", request.url))

  try {
    // Create a Supabase client for handling the code exchange
    const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          res.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    })

    // If we have a token, verify it directly
    if (token) {
      console.log("Attempting to verify token directly:", token.substring(0, 10) + "...")

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "recovery",
        })

        if (error) {
          console.error("Token verification error:", error.message)
          return NextResponse.redirect(
            new URL(`/forgot-password?error=${encodeURIComponent(error.message)}`, request.url),
          )
        }

        console.log("Token verification successful, redirecting to reset-password")
      } catch (verifyError: any) {
        console.error("Token verification exception:", verifyError.message)
        return NextResponse.redirect(
          new URL(`/forgot-password?error=${encodeURIComponent(verifyError.message)}`, request.url),
        )
      }
    }

    // If we have a code, exchange it for a session
    if (code) {
      console.log("Attempting to exchange code for session:", code.substring(0, 10) + "...")

      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.error("Session exchange error:", error.message)
          return NextResponse.redirect(
            new URL(`/forgot-password?error=${encodeURIComponent(error.message)}`, request.url),
          )
        }

        console.log("Code exchange successful, redirecting to reset-password")
      } catch (exchangeError: any) {
        console.error("Code exchange exception:", exchangeError.message)
        return NextResponse.redirect(
          new URL(`/forgot-password?error=${encodeURIComponent(exchangeError.message)}`, request.url),
        )
      }
    }

    // If we don't have a token or code, redirect to forgot-password
    if (!token && !code) {
      console.error("No token or code provided")
      return NextResponse.redirect(new URL(`/forgot-password?error=No reset token or code provided`, request.url))
    }

    // Always redirect to reset-password page for password reset flows
    return res
  } catch (err: any) {
    console.error("Password reset callback error:", err.message)
    return NextResponse.redirect(
      new URL(`/forgot-password?error=Unexpected error: ${encodeURIComponent(err.message)}`, request.url),
    )
  }
}
