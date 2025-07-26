import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("Price system status check requested")

    // Get system health status
    const { data: healthData, error: healthError } = await supabase.rpc("get_price_system_health")

    if (healthError) {
      console.error("Health check error:", healthError)
      return NextResponse.json({ success: false, error: healthError.message }, { status: 500 })
    }

    // Get cron status
    const { data: cronData, error: cronError } = await supabase.rpc("get_cron_status")

    if (cronError) {
      console.error("Cron status error:", cronError)
      return NextResponse.json({ success: false, error: cronError.message }, { status: 500 })
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      health: healthData,
      cron: cronData,
      endpoints: {
        cron: "/api/cron/weekly-price",
        manual: "/api/test/price-calculation",
        status: "/api/status/price-system",
      },
    }

    console.log("System status retrieved successfully")
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Status endpoint error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
