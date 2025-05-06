import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// Country-specific phrases for the AI to use
const COUNTRY_PHRASES = {
  southAfrica: {
    greetings: ["Howzit", "Sawubona", "Dumela", "Molo", "Eita"],
    expressions: [
      "lekker",
      "shame",
      "just now",
      "now now",
      "robot",
      "bakkie",
      "eish",
      "yebo",
      "howzit",
      "bru",
      "china",
    ],
    slang: [
      "That's so lekker!",
      "Eish, that's a challenge.",
      "Let's make a plan.",
      "I'll help you just now.",
      "That's a moerse good strategy!",
      "Your investments are looking sharp!",
    ],
  },
  namibia: {
    greetings: ["Ondjeni", "Moro", "Ongahepo", "Hallo", "Wazup"],
    expressions: ["lekker", "kiff", "aweh", "bru", "hectic", "leka", "sharp"],
    slang: [
      "That's lekker, my friend!",
      "Sharp sharp!",
      "Let's make a plan for your investments.",
      "Your strategy is kiff!",
      "Aweh, that's a good question!",
    ],
  },
  default: {
    greetings: ["Hello", "Hi there", "Greetings", "Hey"],
    expressions: ["great", "excellent", "fantastic", "wonderful"],
    slang: [
      "That's great!",
      "Excellent question!",
      "Let's work on that together.",
      "I'm here to help you succeed.",
      "Your investments are looking good!",
    ],
  },
}

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

// Helper function to format date for comparison
function formatDateForComparison(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

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

    const { message, userId, assistantName, country } = body

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

    // Get transaction history
    let transactionHistory = []
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_uuid", userId)
        .order("created_at", { ascending: false })
        .limit(50) // Get the last 50 transactions

      if (!error && data) {
        // Format transactions for easier reference
        transactionHistory = data.map((tx) => ({
          date: formatDateForComparison(tx.created_at),
          rawDate: tx.created_at,
          type: tx.transaction_type,
          amount: tx.amount,
          amountUsd: tx.amount_usd,
          recipient: tx.recipient_email,
          sender: tx.sender_email,
          reference: tx.reference,
          description: tx.description,
          accountType: tx.account_type,
        }))
      }
    } catch (error) {
      console.error("Error fetching transaction history:", error)
      // Continue with empty array
    }

    // Get detailed referral data
    let referrals = []
    try {
      // First get the basic referral data
      const { data: referralData, error: referralError } = await supabase
        .from("referrals")
        .select("*")
        .eq("user_uuid", userId)

      if (!referralError && referralData) {
        // For each referral, get additional user data
        const referralsWithDetails = await Promise.all(
          referralData.map(async (referral) => {
            // Get user details for this referral
            const { data: userData, error: userError } = await supabase
              .from("app_users")
              .select("email, display_id, country, referral_code, created_at")
              .eq("user_uuid", referral.referred_uuid)
              .single()

            // Get progression data for this referral
            const { data: progressionData, error: progressionError } = await supabase
              .from("progression_levels")
              .select("*")
              .eq("user_uuid", referral.referred_uuid)
              .single()

            // Get vesting data for this referral
            const { data: vestingData, error: vestingError } = await supabase
              .from("vesting_schedules")
              .select("*")
              .eq("user_uuid", referral.referred_uuid)

            // Get transaction count for this referral
            const { count: transactionCount, error: transactionError } = await supabase
              .from("transactions")
              .select("*", { count: "exact", head: true })
              .eq("user_uuid", referral.referred_uuid)

            // Calculate activity score based on progression, vesting, and transactions
            let activityScore = 0
            let activityLevel = "Inactive"

            if (progressionData) {
              // Add points based on level progression
              activityScore += (progressionData.level1_progress || 0) * 1
              activityScore += (progressionData.level2_progress || 0) * 2
              activityScore += (progressionData.level3_progress || 0) * 3
            }

            if (vestingData && vestingData.length > 0) {
              // Add points for each active vesting schedule
              activityScore += vestingData.length * 5
            }

            if (transactionCount) {
              // Add points based on transaction activity
              activityScore += Math.min(transactionCount, 20) // Cap at 20 points
            }

            // Determine activity level
            if (activityScore > 50) {
              activityLevel = "Very Active"
            } else if (activityScore > 30) {
              activityLevel = "Active"
            } else if (activityScore > 10) {
              activityLevel = "Moderately Active"
            } else if (activityScore > 0) {
              activityLevel = "Minimally Active"
            }

            return {
              referralId: referral.id,
              referredUuid: referral.referred_uuid,
              email: userData?.email || "Unknown",
              displayId: userData?.display_id || "Unknown",
              country: userData?.country || "Unknown",
              referralCode: userData?.referral_code || "None",
              joinDate: userData?.created_at ? formatDateForComparison(userData.created_at) : "Unknown",
              level1Progress: progressionData?.level1_progress || 0,
              level2Progress: progressionData?.level2_progress || 0,
              level3Progress: progressionData?.level3_progress || 0,
              vestingSchedules: vestingData?.length || 0,
              transactionCount: transactionCount || 0,
              activityScore,
              activityLevel,
            }
          }),
        )

        // Sort referrals by activity score (ascending, so least active first)
        referrals = referralsWithDetails.sort((a, b) => a.activityScore - b.activityScore)
      }
    } catch (error) {
      console.error("Error fetching detailed referral data:", error)
      // Continue with empty array
    }

    // Get referral count
    const referralCount = referrals.length

    // Create the full referral link
    const referralLink = userData.referral_code
      ? `www.peer-wealth.com/register?ref=${userData.referral_code}`
      : "available on your settings page"

    // Use the provided assistant name or default to a generic name
    const botName = assistantName || "Assistant"

    // Determine country-specific phrases
    let countryPhrases
    const normalizedCountry = (country || userData.country || "").trim().toLowerCase()

    if (normalizedCountry === "south africa" || normalizedCountry === "za" || normalizedCountry === "rsa") {
      countryPhrases = COUNTRY_PHRASES.southAfrica
    } else if (normalizedCountry === "namibia" || normalizedCountry === "na") {
      countryPhrases = COUNTRY_PHRASES.namibia
    } else {
      countryPhrases = COUNTRY_PHRASES.default
    }

    // Format transaction history for the system message
    const formattedTransactions =
      transactionHistory.length > 0
        ? `RECENT TRANSACTIONS (Last ${transactionHistory.length} transactions):
${transactionHistory
  .map(
    (tx, index) =>
      `${index + 1}. Date: ${tx.date}
   Type: ${tx.type}
   Amount: ${tx.amount} ${tx.type.includes("AFT") ? "AFT" : "PWT"} (${tx.amountUsd} USD)
   ${tx.recipient ? `Recipient: ${tx.recipient}` : ""}
   ${tx.sender ? `Sender: ${tx.sender}` : ""}
   Reference: ${tx.reference}
   ${tx.description ? `Description: ${tx.description}` : ""}
   Account: ${tx.accountType}
`,
  )
  .join("\n")}`
        : "No recent transactions found."

    // Format referral data for the system message
    const formattedReferrals =
      referrals.length > 0
        ? `REFERRAL PERFORMANCE (Sorted by activity level, least active first):
${referrals
  .map(
    (ref, index) =>
      `${index + 1}. Email: ${ref.email}
   Display ID: ${ref.displayId}
   Country: ${ref.country}
   Referral Code: ${ref.referralCode}
   Joined: ${ref.joinDate}
   Level 1 Progress: ${ref.level1Progress}%
   Level 2 Progress: ${ref.level2Progress}%
   Level 3 Progress: ${ref.level3Progress}%
   Vesting Schedules: ${ref.vestingSchedules}
   Transaction Count: ${ref.transactionCount}
   Activity Score: ${ref.activityScore}
   Activity Level: ${ref.activityLevel}
`,
  )
  .join("\n")}`
        : "No referrals found."

    // Create system message with user data
    const systemMessage = `
You are ${botName}, a friendly and helpful assistant for Peer Wealth users. ALWAYS refer to yourself as "${botName}" and never as "PeerBot" or any other name.

USER INFORMATION:
User ID: ${userId}
Display ID: ${userData.display_id || "Not available"}
Email: ${userData.email || "Not available"}
Country: ${userData.country || "Not specified"}
Referral Code: ${userData.referral_code || "Not available"}
Full Referral Link: ${referralLink}

WALLET BALANCES:
PWT Invest: ${balanceData.pwt_invest_balance || 0} PWT (Value: ${(balanceData.pwt_invest_balance || 0) * 10} USD)
PWT Cashout: ${balanceData.pwt_cashout_balance || 0} PWT (Value: ${(balanceData.pwt_cashout_balance || 0) * 10} USD)
AFT: ${balanceData.activation_fee_balance || 0} AFT (Value: ${balanceData.activation_fee_balance || 0} USD)

ACTIVITY SUMMARY:
Total Referrals: ${referralCount}

${formattedTransactions}

${formattedReferrals}

PLATFORM KNOWLEDGE:
${COMPANY_INFO}

COUNTRY-SPECIFIC LANGUAGE:
Use these greetings occasionally: ${countryPhrases.greetings.join(", ")}
Use these expressions in your responses: ${countryPhrases.expressions.join(", ")}
Occasionally use phrases like: ${countryPhrases.slang.join(" | ")}

INSTRUCTIONS:
1. ALWAYS introduce yourself as "${botName}" and consistently use this name throughout the conversation. NEVER use any other name.
2. Be friendly, bubbly, and enthusiastic in your responses.
3. Use emojis appropriately to convey a positive tone.
4. Focus on helping the user make money through the platform.
5. Only provide information about THIS user's data - never share data about other users.
6. If asked about sensitive company data (revenue, user count) or inappropriate topics, politely decline.
7. Format your responses with bold text for important points and use bullet points for lists.
8. When suggesting strategies, emphasize referrals and vesting schedules as key earning methods.
9. Always be accurate about how the platform works based on the knowledge provided.
10. IMPORTANT: Whenever you encourage the user to invite others, ALWAYS include their full referral link in this format: "${referralLink}" - do not just mention the referral code.
11. Always remind them they can find their referral link on the settings page.
12. Occasionally use country-specific greetings and expressions to create a more personalized experience.
13. When the user asks about specific transactions, ALWAYS check the transaction history provided above and give accurate information.
14. For date-specific queries (e.g., "Who did I send tokens to on May 4th?"), search the transaction history for matching dates and provide the exact details.
15. NEVER say you can't access transaction details or referral data - you have access to the user's complete information and should provide specific answers.
16. When asked about referrals, provide specific information about their performance, including which ones are most/least active.
17. Offer specific advice for helping underperforming referrals based on their activity level and progress.
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
