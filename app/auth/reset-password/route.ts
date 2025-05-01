import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { env } from "@/lib/env"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get("token")
  const type = requestUrl.searchParams.get("type") || "recovery"
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  console.log("Password reset handler received:", {
    token: token ? `${token.substring(0, 10)}...` : null,
    type,
    error,
    errorDescription,
    url: request.url,
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
    // Create a Supabase client for handling the token verification
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

    // If we have a token, verify it directly using verifyOtp
    if (token) {
      console.log("Attempting to verify recovery token")

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "recovery",
        })

        if (error) {
          console.error("Token verification error:", error.message)
          return NextResponse.redirect(
            new URL(`/forgot-password?error=${encodeURIComponent(error.message)}`, request.url),
          )
        }

        console.log("Token verification successful:", data)

        // Add token to the redirect URL as a query parameter
        // This helps the frontend know that verification was successful
        const resetUrl = new URL("/reset-password", request.url)
        resetUrl.searchParams.set("verified", "true")

        return NextResponse.redirect(resetUrl)
      } catch (verifyError: any) {
        console.error("Token verification exception:", verifyError.message)
        return NextResponse.redirect(
          new URL(`/forgot-password?error=${encodeURIComponent(verifyError.message)}`, request.url),
        )
      }
    }

    // If we don't have a token, redirect to forgot-password
    if (!token) {
      console.error("No token provided")
      return NextResponse.redirect(new URL(`/forgot-password?error=No reset token provided`, request.url))
    }

    // Default fallback - should not reach here
    return res
  } catch (err: any) {
    console.error("Password reset handler error:", err.message)
    return NextResponse.redirect(
      new URL(`/forgot-password?error=Unexpected error: ${encodeURIComponent(err.message)}`, request.url),
    )
  }
}
