import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(request: NextRequest) {
  try {
    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() })

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If accessing a protected route and not logged in, redirect to login
    const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard")

    if (isProtectedRoute && !session) {
      const redirectUrl = new URL("/login", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If accessing login/register while logged in, redirect to dashboard
    const isAuthRoute = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register"

    if (isAuthRoute && session) {
      const redirectUrl = new URL("/dashboard", request.url)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (e) {
    // If there's an error, allow the request to continue
    console.error("Middleware error:", e)
  }

  return NextResponse.next()
}

// Specify which routes this middleware should run for
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
