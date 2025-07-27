import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Get request body
    const body = await request.json().catch(() => ({}))
    const { action = "weekly_price_calculation", manual = false } = body

    console.log("🔄 Weekly price cron triggered:", { action, manual })

    if (action === "weekly_price_calculation") {
      // Run the simplified weekly price calculation
      const { data, error } = await supabase.rpc("calculate_weekly_share_price_simplified")

      if (error) {
        console.error("❌ Price calculation error:", error)
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          },
          { status: 500 },
        )
      }

      console.log("✅ Price calculation successful:", data)

      return NextResponse.json({
        success: true,
        message: "Weekly share price calculated successfully",
        data,
        timestamp: new Date().toISOString(),
      })
    }

    if (action === "test_jse200") {
      // Test JSE200 data availability
      const { data, error } = await supabase
        .from("JSE200_PriceUpdate_Mondays")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3)

      if (error) {
        console.error("❌ JSE200 test error:", error)
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
        message: "JSE200 data test completed",
        jse200_data: data,
        count: data?.length || 0,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action specified",
        available_actions: ["weekly_price_calculation", "test_jse200"],
      },
      { status: 400 },
    )
  } catch (error: any) {
    console.error("❌ Weekly price cron error:", error)
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

export async function GET() {
  return NextResponse.json({
    message: "Weekly price cron endpoint",
    methods: ["POST"],
    actions: ["weekly_price_calculation", "test_jse200"],
    schedule: "Every Monday at 09:20 AM",
  })
}
