import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    // Get comprehensive system health
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

    // Get current cron status
    const { data: cronStatus, error: cronError } = await supabase.rpc("get_cron_status")

    if (cronError) {
      console.error("Cron status error:", cronError)
      return NextResponse.json(
        {
          success: false,
          error: cronError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Get data consistency check
    const { data: consistencyData, error: consistencyError } = await supabase.rpc("check_price_data_consistency")

    if (consistencyError) {
      console.error("Consistency check error:", consistencyError)
      // Don't fail the entire request for consistency check errors
    }

    return NextResponse.json({
      success: true,
      system_health: healthData,
      cron_status: cronStatus,
      data_consistency: consistencyData || { error: "Consistency check failed" },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
