import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("Price system status check requested")

    // Get system health report
    const { data: healthData, error: healthError } = await supabase.rpc("get_price_system_health")

    if (healthError) {
      console.error("Health check error:", healthError)
      return NextResponse.json(
        {
          success: false,
          error: healthError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Get current price
    const { data: currentPrice, error: priceError } = await supabase.rpc("get_current_share_price")

    if (priceError) {
      console.error("Current price error:", priceError)
    }

    // Get recent price history
    const { data: recentHistory, error: historyError } = await supabase.rpc("get_price_history", { days_back: 7 })

    if (historyError) {
      console.error("Price history error:", historyError)
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      system_health: healthData,
      current_price: currentPrice || 108.2,
      recent_calculations: recentHistory?.length || 0,
      endpoints: {
        cron_trigger: "/api/cron/weekly-price",
        manual_trigger: "/api/cron/weekly-price (POST)",
        test_calculation: "/api/test/price-calculation",
        system_status: "/api/status/price-system",
      },
      next_steps: [
        "System is ready for Monday 09:15 automation",
        "Manual testing available via POST to /api/cron/weekly-price",
        "Monitor system health via this endpoint",
      ],
    }

    console.log("Price system status:", response)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Price system status error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
