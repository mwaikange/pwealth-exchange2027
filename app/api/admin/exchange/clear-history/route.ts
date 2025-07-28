import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-singleton"

export async function POST(request: NextRequest) {
  try {
    console.log("[ADMIN] Manual order history clear triggered")

    const { data, error } = await supabase.rpc("clear_weekly_order_history")

    if (error) {
      console.error("[ADMIN] Error clearing order history:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("[ADMIN] Order history clear result:", data)

    return NextResponse.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[ADMIN] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
