import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  // Check if the URL matches the referral pattern
  if (url.pathname.startsWith("/ref/")) {
    // Extract the referral code
    const referralCode = url.pathname.replace("/ref/", "")

    // Redirect to the registration page with the referral code
    url.pathname = "/register"
    url.searchParams.set("ref", referralCode)

    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Configure the matcher to only run on /ref/* paths
export const config = {
  matcher: ["/ref/:path*"],
}
