import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Create a Supabase client specifically for the middleware
  const supabase = createMiddlewareClient({ req, res })

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/api/auth/callback", "/verify-email"]
  const isPublicRoute = publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Allow access to public routes regardless of auth status
  if (isPublicRoute) {
    // If user is logged in and trying to access login/register, redirect to dashboard
    if (session && (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    // Otherwise allow access to public routes
    return res
  }

  // For protected routes, check if user is authenticated
  if (!session && req.nextUrl.pathname.startsWith("/dashboard")) {
    // Redirect to login if not authenticated
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Allow authenticated users to access protected routes
  return res
}

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
