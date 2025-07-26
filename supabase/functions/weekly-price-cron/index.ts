import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Deno } from "https://deno.land/std@0.168.0/node/global.ts"

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

    const { action } = await req.json()

    if (action === "weekly_price_calculation") {
      // Run weekly price calculation based on JSE200 percentage change
      const { data, error } = await supabaseClient.rpc("calculate_weekly_share_price_from_jse200")

      if (error) {
        console.error("Weekly price calculation error:", error)
        throw error
      }

      console.log("Weekly price calculation result:", data)

      return new Response(
        JSON.stringify({
          success: true,
          message: "Weekly share price calculated from JSE200 percentage change",
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
      // Manual trigger for testing
      const { data, error } = await supabaseClient.rpc("trigger_weekly_price_calculation")

      if (error) {
        console.error("Manual trigger error:", error)
        throw error
      }

      console.log("Manual trigger result:", data)

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
        console.error("Get current price error:", error)
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
      const { data, error } = await supabaseClient.rpc("get_price_history", { limit_count: 10 })

      if (error) {
        console.error("Get price history error:", error)
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

    if (action === "get_jse200_history") {
      // Get JSE200 history
      const { data, error } = await supabaseClient.rpc("get_jse200_history", { limit_count: 10 })

      if (error) {
        console.error("Get JSE200 history error:", error)
        throw error
      }

      return new Response(
        JSON.stringify({
          success: true,
          jse200_history: data,
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
          "get_jse200_history",
        ],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    )
  } catch (error) {
    console.error("Cron function error:", error)
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
