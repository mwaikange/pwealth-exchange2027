import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testing price calculation")

    // Test the calculation function
    const { data, error } = await supabase.rpc("trigger_weekly_price_calculation")

    if (error) {
      console.error("❌ Test calculation error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("✅ Test calculation completed:", data)

    return NextResponse.json({
      success: true,
      result: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Test calculation exception:", error)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { percent_change = 2.5, description = "Manual test" } = body

    console.log("🧪 Simulating price calculation:", { percent_change, description })

    // Simulate the calculation
    const { data, error } = await supabase.rpc("simulate_price_calculation", {
      percent_change: Number(percent_change),
      description: String(description),
    })

    if (error) {
      console.error("❌ Simulation error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("✅ Simulation completed:", data)

    return NextResponse.json({
      success: true,
      simulation: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Simulation exception:", error)
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
