import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Deno } from "https://deno.land/std@0.168.0/io/mod.ts" // Declare Deno variable

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const { action } = await req.json().catch(() => ({ action: "weekly_price_calculation" }))

    if (action === "weekly_price_calculation" || action === "calculate_price") {
      console.log("🔄 Starting simplified weekly price calculation...")

      // Run the simplified weekly price calculation
      const { data, error } = await supabaseClient.rpc("calculate_weekly_share_price_simplified")

      if (error) {
        console.error("❌ Weekly price calculation error:", error)
        throw error
      }

      console.log("✅ Weekly price calculation result:", data)

      return new Response(
        JSON.stringify({
          success: true,
          message: "Weekly share price calculated using simplified JSE200 method",
          calculation_details: data,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    if (action === "manual_trigger") {
      console.log("🔄 Manual trigger for price calculation...")

      // Manual trigger for testing
      const { data, error } = await supabaseClient.rpc("trigger_weekly_price_calculation")

      if (error) {
        console.error("❌ Manual trigger error:", error)
        throw error
      }

      console.log("✅ Manual trigger result:", data)

      return new Response(
        JSON.stringify({
          success: true,
          message: "Manual price calculation triggered successfully",
          calculation_details: data,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    if (action === "get_current_price") {
      // Get current share price
      const { data, error } = await supabaseClient.rpc("get_current_share_price")

      if (error) {
        console.error("❌ Get current price error:", error)
        throw error
      }

      return new Response(
        JSON.stringify({
          success: true,
          current_price: data,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    if (action === "get_price_history") {
      // Get price history
      const { data, error } = await supabaseClient.rpc("get_price_history", { days_back: 30 })

      if (error) {
        console.error("❌ Get price history error:", error)
        throw error
      }

      return new Response(
        JSON.stringify({
          success: true,
          price_history: data,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    if (action === "test_jse200_data") {
      // Test JSE200 data availability
      const { data, error } = await supabaseClient
        .from("JSE200_PriceUpdate_Mondays")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) {
        console.error("❌ JSE200 data test error:", error)
        throw error
      }

      return new Response(
        JSON.stringify({
          success: true,
          jse200_data: data,
          count: data?.length || 0,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    return new Response(
      JSON.stringify({
        error: "Invalid action specified",
        available_actions: [
          "weekly_price_calculation",
          "manual_trigger",
          "get_current_price",
          "get_price_history",
          "test_jse200_data",
        ],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    )
  } catch (error) {
    console.error("❌ Cron function error:", error)
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    )
  }
})
