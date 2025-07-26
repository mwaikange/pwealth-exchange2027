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

    if (action === "weekly_price_calculation") {
      // Run weekly price calculation based on JSE200 percentage change
      const { data, error } = await supabaseClient.rpc("calculate_weekly_share_price_from_jse200")

      if (error) {
        throw error
      }

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
        throw error
      }

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
