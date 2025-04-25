import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server-app"

export async function POST(request: Request) {
  try {
    console.log("[API] Verifying PayGate.to payment...")

    // Parse the incoming request
    const body = await request.json()
    const { orderId, txid_in, txid_out, value_coin, address_in } = body

    console.log(`[API] Verification details:`, body)

    // Validate required fields
    if (!orderId || !txid_in || !txid_out || !value_coin || !address_in) {
      console.error("[API] Missing required verification fields")
      return NextResponse.json({ error: "Missing required verification fields" }, { status: 400 })
    }

    // Get the payment transaction from our database
    const supabase = createServerClient()
    const { data: paymentData, error: fetchError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("order_id", orderId)
      .single()

    if (fetchError || !paymentData) {
      console.error(`[API] Error fetching payment transaction: ${fetchError?.message || "Not found"}`)
      return NextResponse.json({ error: "Payment transaction not found" }, { status: 404 })
    }

    // Verify the encrypted_address matches what we stored
    if (paymentData.encrypted_address !== address_in) {
      console.error(`[API] Address mismatch: ${paymentData.encrypted_address} vs ${address_in}`)
      return NextResponse.json({ error: "Address verification failed" }, { status: 400 })
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
      console.error(`[API] Error updating payment status: ${updateError.message}`)
      // Continue anyway, just log the error
    }

    console.log(`[API] Payment verified successfully: ${orderId}`)

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
    })
  } catch (error) {
    console.error("[API] Payment verification error:", error)
    return NextResponse.json({ error: "Internal server error during payment verification" }, { status: 500 })
  }
}
