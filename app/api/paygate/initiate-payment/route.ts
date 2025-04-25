import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server-app"

export async function POST(request: Request) {
  try {
    console.log("[API] Initiating PayGate.to payment...")

    // Parse the incoming request
    const body = await request.json()
    const { amount, email, orderId } = body

    console.log(`[API] Payment details: Amount: ${amount}, Email: ${email}, OrderId: ${orderId}`)

    // Validate required fields
    if (!amount || !email || !orderId) {
      console.error("[API] Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate amount
    if (isNaN(amount) || amount < 50 || amount > 10000) {
      console.error(`[API] Invalid amount: ${amount}`)
      return NextResponse.json({ error: "Amount must be between $50 and $10,000" }, { status: 400 })
    }

    // Get the app URL
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peer-wealth.com"
    const callback = encodeURIComponent(`${appUrl}/payment-confirmation?orderId=${orderId}&amount=${amount}`)
    const wallet = "0xC09eA27771240b0bdE85357EBbaD65B477B4de1C" // Target wallet for USDC

    console.log(`[API] Using callback URL: ${callback}`)
    console.log(`[API] Using wallet: ${wallet}`)

    // Step 1: Generate temporary receiving wallet
    const walletUrl = `https://api.paygate.to/control/wallet.php?address=${wallet}&callback=${callback}`
    console.log(`[API] Requesting temporary wallet from: ${walletUrl}`)

    const walletResponse = await fetch(walletUrl)

    if (!walletResponse.ok) {
      const errorText = await walletResponse.text()
      console.error(`[API] Failed to get temporary wallet: ${errorText}`)
      return NextResponse.json({ error: "Failed to generate temporary wallet" }, { status: 500 })
    }

    const walletData = await walletResponse.json()
    console.log(`[API] Received temporary wallet: ${JSON.stringify(walletData)}`)

    const encryptedAddress = walletData.address_in

    if (!encryptedAddress) {
      console.error("[API] No encrypted address received from PayGate")
      return NextResponse.json({ error: "No encrypted address received from payment gateway" }, { status: 500 })
    }

    // Step 2: Generate payment URL
    const paymentUrl = `https://checkout.paygate.to/process-payment.php?address=${encryptedAddress}&amount=${amount}&provider=moonpay&email=${encodeURIComponent(email)}&currency=USD`
    console.log(`[API] Generated payment URL: ${paymentUrl}`)

    // Save payment info in database for verification later
    try {
      const supabase = createServerClient()
      const { error } = await supabase.from("payment_transactions").insert({
        order_id: orderId,
        user_email: email,
        amount_usd: amount,
        encrypted_address: encryptedAddress,
        status: "initiated",
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error(`[API] Error saving payment transaction: ${error.message}`)
        // Continue anyway, just log the error
      } else {
        console.log(`[API] Payment transaction saved to database`)
      }
    } catch (dbError) {
      console.error(`[API] Database error: ${dbError}`)
      // Continue anyway, just log the error
    }

    return NextResponse.json({
      success: true,
      paymentUrl,
      orderId,
    })
  } catch (error) {
    console.error("[API] Payment initiation error:", error)
    return NextResponse.json({ error: "Internal server error during payment initiation" }, { status: 500 })
  }
}
