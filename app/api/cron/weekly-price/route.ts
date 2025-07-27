import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Weekly price cron job triggered")

    // Call the cron handler function
    const { data, error } = await supabase.rpc("handle_weekly_price_cron")

    if (error) {
      console.error("❌ Cron job error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("✅ Cron job completed:", data)

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Cron job exception:", error)
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
    console.log("🔄 Manual price calculation triggered")

    // Call the manual trigger function
    const { data, error } = await supabase.rpc("handle_manual_price_cron")

    if (error) {
      console.error("❌ Manual trigger error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("✅ Manual trigger completed:", data)

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Manual trigger exception:", error)
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
