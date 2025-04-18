import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(request: NextRequest) {
  try {
    // Create a response to modify
    const res = NextResponse.next()

    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ req: request, res })

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Public routes that don't require authentication
    const publicRoutes = ["/login", "/register", "/api/auth/callback", "/verify-email"]
    const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

    // If accessing a protected route and not logged in, redirect to login
    const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard")

    // Allow access to public routes regardless of auth status
    if (isPublicRoute) {
      // If user is logged in and trying to access login/register, redirect to dashboard
      if (session && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register")) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
      // Otherwise allow access to public routes
      return res
    }

    // For protected routes, check if user is authenticated
    if (isProtectedRoute && !session) {
      // Add a small delay to ensure auth state is fully synced
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Double-check session after delay
      const {
        data: { session: refreshedSession },
      } = await supabase.auth.getSession()

      if (!refreshedSession) {
        // Redirect to login if not authenticated
        return NextResponse.redirect(new URL("/login", request.url))
      }
    }

    // Allow authenticated users to access protected routes
    return res
  } catch (e) {
    console.error("Middleware error:", e)
    // If there's an error, allow the request to continue
    return NextResponse.next()
  }
}

// Specify which routes this middleware should run for
export const config = {
  matcher: [
    // Match all routes that need authentication checks
    "/dashboard/:path*",
    // Match auth-related routes for redirects
    "/login",
    "/register",
    "/verify-email",
    "/api/auth/callback",
  ],
}
