import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("[CRON] Weekly price calculation triggered at 10:03 (Windhoek time)")

    // Call the price calculation with retry logic
    const { data, error } = await supabase.rpc("calculate_price_with_retry")

    if (error) {
      console.error("[CRON] Error calculating weekly price:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
          scheduled_time: "Monday 10:03 (Windhoek time)",
        },
        { status: 500 },
      )
    }

    console.log("[CRON] Price calculation result:", data)

    return NextResponse.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
      scheduled_time: "Monday 10:03 (Windhoek time)",
      next_calculation: "Next Monday 10:03 (Windhoek time)",
    })
  } catch (error: any) {
    console.error("[CRON] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        scheduled_time: "Monday 10:03 (Windhoek time)",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
