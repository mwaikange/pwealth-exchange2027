import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Price calculation test - GET")

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

    console.log("✅ Test calculation result:", data)

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Test route error:", error)
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
    const { percent_change, description } = body

    console.log("🧪 Price calculation simulation - POST", { percent_change, description })

    if (percent_change !== undefined) {
      // Insert test JSE200 data
      const { error: insertError } = await supabase.from("JSE200_PriceUpdate_Mondays").insert({
        percentage_change: percent_change,
        description: description || `Test simulation: ${percent_change}% change`,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("❌ Error inserting test JSE200 data:", insertError)
        return NextResponse.json(
          {
            success: false,
            error: insertError.message,
            timestamp: new Date().toISOString(),
          },
          { status: 500 },
        )
      }
    }

    // Run the calculation
    const { data, error } = await supabase.rpc("trigger_weekly_price_calculation")

    if (error) {
      console.error("❌ Simulation calculation error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("✅ Simulation result:", data)

    return NextResponse.json({
      success: true,
      data,
      simulation: {
        percent_change,
        description,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Simulation route error:", error)
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
