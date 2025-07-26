import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("Price calculation test requested")

    // Get current system status
    const { data, error } = await supabase.rpc("get_price_system_health")

    if (error) {
      console.error("Test status error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const response = {
      success: true,
      message: "Price calculation system is ready for testing",
      timestamp: new Date().toISOString(),
      system_health: data,
      available_actions: [
        "POST /api/test/price-calculation - Manual calculation",
        "GET /api/cron/weekly-price - Cron simulation",
        "POST /api/cron/weekly-price - Force calculation",
      ],
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Test endpoint error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("Manual price calculation test triggered")

    // Parse request body for custom parameters
    let customParams = {}
    try {
      const body = await request.json()
      customParams = body
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Call the manual calculation function
    const { data, error } = await supabase.rpc("trigger_weekly_price_calculation")

    if (error) {
      console.error("Manual calculation test error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const response = {
      success: true,
      message: "Manual price calculation completed",
      timestamp: new Date().toISOString(),
      calculation_result: data,
      custom_params: customParams,
    }

    console.log("Manual calculation test completed:", response)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Manual calculation test error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
