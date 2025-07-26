import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Create Supabase client with service role key for cron operations
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    console.log("Weekly price cron job triggered at:", new Date().toISOString())

    // Call the Supabase function to handle weekly price calculation
    const { data, error } = await supabase.rpc("handle_weekly_price_cron")

    if (error) {
      console.error("Cron execution error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("Cron execution result:", data)

    // Return the result from the database function
    return NextResponse.json({
      success: true,
      result: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Cron function error:", error)
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

// Optional: Handle POST requests for manual triggers
export async function POST() {
  try {
    console.log("Manual weekly price calculation triggered at:", new Date().toISOString())

    // Call the manual trigger function (bypasses time checks)
    const { data, error } = await supabase.rpc("handle_manual_price_cron")

    if (error) {
      console.error("Manual trigger error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("Manual trigger result:", data)

    return NextResponse.json({
      success: true,
      result: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Manual trigger error:", error)
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
