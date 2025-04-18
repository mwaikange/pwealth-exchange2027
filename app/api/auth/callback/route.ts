import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { env } from "@/lib/env"

export async function GET(request: NextRequest) {
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
      const res = NextResponse.redirect(new URL("/dashboard", request.url))

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

      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Session exchange error:", error.message)
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
      }

      // Successful authentication, redirect to dashboard
      return res
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
