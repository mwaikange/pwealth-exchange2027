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

    const { action } = await req.json()

    if (action === "daily_hodl_snapshot") {
      // Run daily HODL snapshot calculation
      const { error } = await supabaseClient.rpc("calculate_daily_hodl_snapshot")

      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Daily HODL snapshot calculated successfully",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    if (action === "weekly_price_calculation") {
      // Run weekly price calculation using JSE200 data
      const { error } = await supabaseClient.rpc("set_weekly_price_from_jse200")

      if (error) {
        throw error
      }

      // Get the updated price
      const { data: weeklyPrice } = await supabaseClient
        .from("weekly_share_prices")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(1)
        .single()

      return new Response(
        JSON.stringify({
          success: true,
          message: "Weekly share price updated from JSE200 data successfully",
          data: weeklyPrice,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    return new Response(JSON.stringify({ error: "Invalid action specified" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  } catch (error) {
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
