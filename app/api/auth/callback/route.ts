import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const type = requestUrl.searchParams.get("type") || ""

  console.log("API callback received, forwarding to appropriate handler:", { type, url: request.url })

  // Create a new URL with the same query parameters
  const newUrl = new URL(request.url)

  // Change the path based on the type
  if (type === "recovery") {
    newUrl.pathname = "/auth/reset-password"
  } else {
    newUrl.pathname = "/auth/callback"
  }

  return NextResponse.redirect(newUrl)
}
