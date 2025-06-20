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
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const { action } = await req.json()

    if (action === "daily_hodl_calculation") {
      console.log("Running daily HODL metrics calculation...")

      // Run daily HODL snapshot calculation
      const { data, error } = await supabaseClient.rpc("calculate_daily_hodl_metrics")

      if (error) {
        throw new Error(`Daily HODL calculation failed: ${error.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "daily_hodl_calculation",
          data: data,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    if (action === "weekly_price_calculation") {
      console.log("Running weekly price calculation...")

      // Run weekly price calculation
      const { data, error } = await supabaseClient.rpc("calculate_weekly_share_price")

      if (error) {
        throw new Error(`Weekly price calculation failed: ${error.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "weekly_price_calculation",
          data: data,
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
      const { data: price, error } = await supabaseClient.rpc("get_latest_share_price")

      if (error) {
        throw new Error(`Failed to get current price: ${error.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          current_price: price,
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
        error: "Invalid action. Use 'daily_hodl_calculation', 'weekly_price_calculation', or 'get_current_price'",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    )
  } catch (error) {
    console.error("Price engine CRON error:", error)

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
