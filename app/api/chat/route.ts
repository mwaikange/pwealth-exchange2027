import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// Company information and knowledge base
const COMPANY_INFO = `
Peer Wealth is a referral-based earning platform where users can earn PWT tokens by inviting others and completing vesting milestones. It empowers individuals with passive income strategies tailored to their activity level.

Exchange Rate:
1 PWT = 10 USD and 1 AFT = 1 USD

Transaction Types:
- IN-PWT RECEIPT: Receiving PWT tokens from another user (affects PWT Invest)
- REFERRAL CLAIM-LvL1/2/3: Commission earned from referrals (affects PWT Cashout)
- BUY-AFT RECEIPT: Tokens received after purchasing AFT (affects AFT Wallet)
- IN-AFT GIFT: AFT tokens received as a gift (affects AFT Wallet)
- CLAIM: Vesting rewards claimed from a schedule (affects PWT Cashout)
- AFT-TopUP: Additional AFT tokens added to wallet (affects AFT Wallet)
- OUT-TRANSFER: Sending PWT tokens to another user (affects PWT Invest or Cashout)
- OUT-AFT GIFT: Sending AFT tokens as a gift (affects AFT Wallet)
- ACTIVATE FEE: Fee paid to activate a level or schedule (affects PWT Invest)
- VESTING: PWT tokens locked in a vesting schedule (affects PWT Invest → Vesting)

Wallet Types:
1. PWT Invest Wallet: Primary wallet for holding PWT tokens, used for investing in vesting schedules
2. PWT Cashout Wallet: Holds tokens that can be withdrawn or transferred, receives earnings from referrals and vesting claims
3. AFT Wallet: Holds AFT tokens (Affiliate Tokens), used for the affiliate program and special promotions

Vesting Schedules:
- All 3 levels have 5 vesting schedules each
- Progress bar shows progress from 1% to 100%
- Every 20% the reward earned is shown and added up until 100%
- When claim button is pressed, all buttons become green and inactive
- When all 15 buttons on all 5 schedules become green and inactive, the level will refresh after 8 seconds

Referral System:
- Users can claim referral rewards based on the activity of their referrals for life
- When a referral completes level 1, you get 1 PWT; level 2, 2 PWT; level 3, 3 PWT
- When a referral claims all earning rewards, their level resets and your earnings start again
- If a referral resets their level before you claim, the system will auto-claim the rewards for you
`

export async function POST(request: Request) {
  try {
    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error("Error parsing request body:", error)
      return NextResponse.json(
        {
          error: "Invalid request body",
          reply: "I couldn't understand that request. Please try again.",
        },
        { status: 400 },
      )
    }

    const { message, userId } = body

    if (!message) {
      return NextResponse.json(
        {
          error: "Message is required",
          reply: "I didn't receive a message to respond to. Please try again.",
        },
        { status: 400 },
      )
    }

    if (!userId) {
      return NextResponse.json(
        {
          error: "User ID is required",
          reply: "I need to know who you are to help you. Please log in again.",
        },
        { status: 400 },
      )
    }

    // Initialize Supabase client
    let supabase
    try {
      supabase = createServerSupabaseClient()
    } catch (error) {
      console.error("Error creating Supabase client:", error)
      return NextResponse.json(
        {
          error: "Database connection error",
          reply: "I'm having trouble connecting to the database. Please try again later.",
        },
        { status: 500 },
      )
    }

    // Get user data
    let userData
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("email, country, display_id, referral_code")
        .eq("user_uuid", userId)
        .single()

      if (error) {
        console.error("Error fetching user data:", error)
        return NextResponse.json(
          {
            error: "User not found",
            reply: "I couldn't find your account information. Please make sure you're logged in.",
          },
          { status: 404 },
        )
      }

      userData = data
    } catch (error) {
      console.error("Error in user data query:", error)
      return NextResponse.json(
        {
          error: "Database error",
          reply: "I'm having trouble accessing your account information. Please try again later.",
        },
        { status: 500 },
      )
    }

    // Get balance data
    let balanceData = { pwt_invest_balance: 0, pwt_cashout_balance: 0, activation_fee_balance: 0 }
    try {
      const { data, error } = await supabase
        .from("balances")
        .select("pwt_invest_balance, pwt_cashout_balance, activation_fee_balance")
        .eq("user_uuid", userId)
        .single()

      if (!error && data) {
        balanceData = data
      }
    } catch (error) {
      console.error("Error fetching balance data:", error)
      // Continue with default values
    }

    // Get referral count
    let referralCount = 0
    try {
      const { count, error } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("user_uuid", userId)

      if (!error && count !== null) {
        referralCount = count
      }
    } catch (error) {
      console.error("Error counting referrals:", error)
      // Continue with default value
    }

    // Create system message with user data
    const systemMessage = `
You are PeerBot, a friendly and helpful assistant for Peer Wealth users.

USER INFORMATION:
User ID: ${userId}
Display ID: ${userData.display_id || "Not available"}
Email: ${userData.email || "Not available"}
Country: ${userData.country || "Not specified"}
Referral Code: ${userData.referral_code || "Not available"}

WALLET BALANCES:
PWT Invest: ${balanceData.pwt_invest_balance || 0} PWT (Value: ${(balanceData.pwt_invest_balance || 0) * 10} USD)
PWT Cashout: ${balanceData.pwt_cashout_balance || 0} PWT (Value: ${(balanceData.pwt_cashout_balance || 0) * 10} USD)
AFT: ${balanceData.activation_fee_balance || 0} AFT (Value: ${balanceData.activation_fee_balance || 0} USD)

ACTIVITY SUMMARY:
Total Referrals: ${referralCount}

PLATFORM KNOWLEDGE:
${COMPANY_INFO}

INSTRUCTIONS:
1. Be friendly, bubbly, and enthusiastic in your responses.
2. Use emojis appropriately to convey a positive tone.
3. Focus on helping the user make money through the platform.
4. Only provide information about THIS user's data - never share data about other users.
5. If asked about sensitive company data (revenue, user count) or inappropriate topics, politely decline.
6. Format your responses with bold text for important points and use bullet points for lists.
7. When suggesting strategies, emphasize referrals and vesting schedules as key earning methods.
8. Always be accurate about how the platform works based on the knowledge provided.
`

    // Call OpenAI API
    try {
      // Use fetch instead of the OpenAI SDK to avoid client-side issues
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: message },
          ],
          temperature: 0.7,
        }),
      })

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({}))
        console.error("OpenAI API error:", errorData)
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`)
      }

      const openaiData = await openaiResponse.json()
      const aiResponse = openaiData.choices[0].message.content

      // Return successful response
      return NextResponse.json({
        reply: aiResponse,
        userId: userId,
      })
    } catch (error: any) {
      console.error("OpenAI API error:", error)
      return NextResponse.json(
        {
          error: `OpenAI API error: ${error.message || "Unknown error"}`,
          reply: "I'm having trouble thinking right now. Please try again in a moment or ask a different question.",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Unhandled error in chat API:", error)

    // Ensure we always return a valid JSON response
    return NextResponse.json(
      {
        error: `Unhandled error: ${error.message || "Unknown error"}`,
        reply: "Something unexpected happened. Please try again later or contact support if the problem persists.",
      },
      { status: 500 },
    )
  }
}
