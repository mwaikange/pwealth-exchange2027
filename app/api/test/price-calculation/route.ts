import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("Price calculation test requested")

    // Get current system status
    const { data: statusData, error: statusError } = await supabase.rpc("get_cron_status")

    if (statusError) {
      console.error("Status check error:", statusError)
      return NextResponse.json(
        {
          success: false,
          error: statusError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Run a simulation with 2% increase
    const { data: simulationData, error: simulationError } = await supabase.rpc("simulate_price_calculation", {
      test_percent_change: 2.0,
      test_description: "API test simulation - 2% increase",
    })

    if (simulationError) {
      console.error("Simulation error:", simulationError)
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      system_status: statusData,
      test_simulation: simulationData,
      available_actions: {
        manual_calculation: "POST /api/cron/weekly-price",
        custom_simulation: "POST /api/test/price-calculation with percent_change",
        system_health: "GET /api/status/price-system",
      },
    }

    console.log("Price calculation test result:", response)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Price calculation test error:", error)
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
    const { percent_change = 1.0, description = "Custom API test" } = body

    console.log(`Custom price simulation requested: ${percent_change}% change`)

    // Run custom simulation
    const { data: simulationData, error: simulationError } = await supabase.rpc("simulate_price_calculation", {
      test_percent_change: Number(percent_change),
      test_description: description,
    })

    if (simulationError) {
      console.error("Custom simulation error:", simulationError)
      return NextResponse.json(
        {
          success: false,
          error: simulationError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Optionally run actual calculation if requested
    let calculationResult = null
    if (body.execute_calculation === true) {
      console.log("Executing actual price calculation...")
      const { data: calcData, error: calcError } = await supabase.rpc("handle_manual_price_cron")

      if (calcError) {
        console.error("Calculation execution error:", calcError)
      } else {
        calculationResult = calcData
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      simulation_result: simulationData,
      calculation_result: calculationResult,
      note: calculationResult
        ? "Both simulation and actual calculation executed"
        : 'Simulation only - add "execute_calculation": true to run actual calculation',
    }

    console.log("Custom price simulation result:", response)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Custom price simulation error:", error)
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
