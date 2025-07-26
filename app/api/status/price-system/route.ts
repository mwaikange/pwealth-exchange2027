import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Checking price system health")

    // Get system health status
    const { data, error } = await supabase.rpc("get_price_system_health")

    if (error) {
      console.error("❌ Health check error:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("✅ Health check completed:", data)

    return NextResponse.json({
      success: true,
      health: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Health check exception:", error)
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
