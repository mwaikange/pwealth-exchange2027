import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function POST(request: NextRequest) {
  try {
    console.log("[ADMIN] Manual exchange open triggered")

    const { data, error } = await supabase.rpc("open_exchange_weekly")

    if (error) {
      console.error("[ADMIN] Error opening exchange:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("[ADMIN] Exchange open result:", data)

    return NextResponse.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[ADMIN] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
