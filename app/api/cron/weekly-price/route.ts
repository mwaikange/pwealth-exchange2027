import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    // This is called by Vercel cron - uses time window check
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

    return NextResponse.json({
      success: true,
      cron_result: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Cron execution error:", error)
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

export async function POST() {
  try {
    // Manual trigger - bypasses time checks
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
      manual_result: data,
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
