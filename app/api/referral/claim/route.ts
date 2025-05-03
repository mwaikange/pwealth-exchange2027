import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Database } from "@/types/supabase"

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

    // Get the user from the session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { referredUuid, level } = await request.json()

    console.log(`API: Recording claim for user ${userId}, referral ${referredUuid}, level ${level}`)

    // Insert the claim using the server-side client
    const { error } = await supabase.from("referral_claims").insert({
      referred_uuid: referredUuid,
      level: Number(level),
      claimed_by: userId,
    })

    if (error) {
      // If the error is about unique constraint, it means this referral was already claimed
      if (error.code === "23505") {
        console.log("API: This referral has already been claimed")
        return NextResponse.json({ success: true, alreadyClaimed: true })
      }

      console.error("API: Error recording claim:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("API: Error in claim API:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
