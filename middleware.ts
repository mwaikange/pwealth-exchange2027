import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const url = request.nextUrl.clone()

  // If there's a ref parameter and we're on the register page, we don't need to do anything
  if (pathname === "/register" && searchParams.has("ref")) {
    return NextResponse.next()
  }

  // If we're on a /ref/CODE path, redirect to /register?ref=CODE
  if (pathname.startsWith("/ref/")) {
    const refCode = pathname.split("/ref/")[1]
    url.pathname = "/register"
    url.searchParams.set("ref", refCode)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: ["/ref/:path*", "/register"],
}
