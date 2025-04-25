import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server-app"

// This is the webhook/callback handler that PayGate.to will call after payment
export async function GET(request: Request) {
  try {
    // Extract URL parameters
    const url = new URL(request.url)
    const orderId = url.searchParams.get("orderId")
    const value_coin = url.searchParams.get("value_coin")
    const coin = url.searchParams.get("coin")
    const txid_in = url.searchParams.get("txid_in")
    const txid_out = url.searchParams.get("txid_out")
    const address_in = url.searchParams.get("address_in")

    console.log("[Callback] Received payment callback:", {
      orderId,
      value_coin,
      coin,
      txid_in,
      txid_out,
      address_in,
    })

    // Validate required fields
    if (!orderId || !value_coin || !txid_in || !txid_out || !address_in) {
      console.error("[Callback] Missing required fields in callback")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Record the payment in our database
    const supabase = createServerClient()

    // Check if the order exists
    const { data: existingOrder, error: fetchError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("order_id", orderId)
      .single()

    if (fetchError || !existingOrder) {
      console.error(`[Callback] Order not found: ${orderId}`)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Update the payment status
    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status: "completed",
        txid_in,
        txid_out,
        value_coin: Number.parseFloat(value_coin),
        completed_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)

    if (updateError) {
      console.error(`[Callback] Error updating payment: ${updateError.message}`)
      return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 })
    }

    console.log(`[Callback] Payment recorded successfully: ${orderId}`)

    // Redirect the user to the payment confirmation page
    const confirmationUrl = `${url.origin}/payment-confirmation?orderId=${orderId}&value_coin=${value_coin}&txid_in=${txid_in}&txid_out=${txid_out}&address_in=${address_in}`

    return NextResponse.redirect(confirmationUrl)
  } catch (error) {
    console.error("[Callback] Payment callback error:", error)
    return NextResponse.json({ error: "Internal server error processing payment callback" }, { status: 500 })
  }
}
