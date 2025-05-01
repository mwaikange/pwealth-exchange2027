import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get("token")
  const type = requestUrl.searchParams.get("type") || "recovery"
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  console.log("Password reset handler received:", {
    token: token ? `${token.substring(0, 10)}...` : null,
    type,
    url: request.url,
  })

  // Instead of verifying the token server-side, pass it to the frontend
  // This is crucial because the token needs to be verified in the browser context
  const resetUrl = new URL("/reset-password", request.url)

  // Pass through the token and type to the frontend
  if (token) resetUrl.searchParams.set("token", token)
  if (type) resetUrl.searchParams.set("type", type)

  console.log("Redirecting to:", resetUrl.toString())

  return NextResponse.redirect(resetUrl)
}
