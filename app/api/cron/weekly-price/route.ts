import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("[CRON] Weekly price calculation triggered")

    // Call the simplified price calculation function
    const { data, error } = await supabase.rpc("calculate_weekly_share_price_simplified")

    if (error) {
      console.error("[CRON] Error calculating weekly price:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("[CRON] Price calculation result:", data)

    return NextResponse.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[CRON] Unexpected error:", error)
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

export async function POST(request: NextRequest) {
  return GET(request)
}
