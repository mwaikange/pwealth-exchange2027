import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    // Manual trigger for testing (bypasses time checks)
    const { data, error } = await supabase.rpc("handle_manual_price_cron")

    if (error) {
      console.error("Test calculation error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("Test calculation result:", data)

    return NextResponse.json({
      success: true,
      test_result: data,
      note: "This is a test calculation that bypasses time checks",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Test calculation error:", error)
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { percent_change, description } = body

    if (typeof percent_change !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "percent_change must be a number",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    // Simulate price calculation with custom percentage
    const { data, error } = await supabase.rpc("simulate_price_calculation", {
      test_percent_change: percent_change,
      test_description: description || `Test with ${percent_change}% change`,
    })

    if (error) {
      console.error("Simulation error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      simulation: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Simulation error:", error)
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
