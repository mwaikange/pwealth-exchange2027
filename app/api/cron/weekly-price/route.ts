import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Weekly price cron triggered via GET")

    // Call the cron handler function
    const { data, error } = await supabase.rpc("handle_weekly_price_cron")

    if (error) {
      console.error("❌ Cron execution error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("✅ Cron execution result:", data)

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Cron route error:", error)
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
    console.log("🔄 Manual price calculation triggered via POST")

    // Call the manual trigger function
    const { data, error } = await supabase.rpc("handle_manual_price_cron")

    if (error) {
      console.error("❌ Manual calculation error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("✅ Manual calculation result:", data)

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Manual calculation route error:", error)
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
