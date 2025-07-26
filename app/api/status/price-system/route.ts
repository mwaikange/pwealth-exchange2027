import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Price system status check")

    // Get system health
    const { data: healthData, error: healthError } = await supabase.rpc("get_price_system_health")

    if (healthError) {
      console.error("❌ Health check error:", healthError)
      return NextResponse.json(
        {
          success: false,
          error: healthError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Get cron status
    const { data: cronData, error: cronError } = await supabase.rpc("get_cron_status")

    if (cronError) {
      console.error("❌ Cron status error:", cronError)
      return NextResponse.json(
        {
          success: false,
          error: cronError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("✅ System status retrieved successfully")

    return NextResponse.json({
      success: true,
      health: healthData,
      cron: cronData,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Status route error:", error)
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
