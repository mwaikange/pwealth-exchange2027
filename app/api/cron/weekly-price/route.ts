import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("Weekly price cron endpoint called via GET")

    // Call the cron handler function
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
      result: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Weekly price cron error:", error)
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
    console.log("Weekly price cron endpoint called via POST (manual trigger)")

    // Call the manual trigger function
    const { data, error } = await supabase.rpc("handle_manual_price_cron")

    if (error) {
      console.error("Manual cron execution error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("Manual cron execution result:", data)

    return NextResponse.json({
      success: true,
      result: data,
      timestamp: new Date().toISOString(),
      note: "Manual trigger executed - time checks bypassed",
    })
  } catch (error: any) {
    console.error("Manual weekly price cron error:", error)
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
