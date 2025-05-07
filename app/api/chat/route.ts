import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// Country-specific phrases for the AI to use
const COUNTRY_PHRASES = {
  southAfrica: {
    greetings: ["Howzit", "Sawubona", "Dumela", "Molo", "Eita"],
    slang: ["That's great!", "Let's make a plan.", "I'll help you with that.", "Your investments are looking good!"],
    currency: "ZAR",
    currencyName: "South African Rand",
  },
  namibia: {
    greetings: ["Ondjeni", "Moro", "Ongahepo", "Hallo"],
    slang: [
      "That's great!",
      "Let's make a plan for your investments.",
      "Your strategy is good!",
      "That's a good question!",
    ],
    currency: "NAD",
    currencyName: "Namibian Dollar",
  },
  default: {
    greetings: ["Hello", "Hi there", "Greetings", "Hey"],
    slang: [
      "That's great!",
      "Excellent question!",
      "Let's work on that together.",
      "I'm here to help you succeed.",
      "Your investments are looking good!",
    ],
    currency: "USD",
    currencyName: "US Dollar",
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

HOW USERS MAKE MONEY ON PEER WEALTH:
Users make money on this platform by growing their investment in tokens and value and then cashing out by selling them to existing or new users.

Investment Process:
1. On level 1, users buy 2 PWT coins (20 USD) and 2 AFT coins (2 USD) to initialize investment - this purchase is made by approaching other users that are selling coins within the community. Alternatively, the AFT fee tokens can be bought from the system - but the PWT invest coins need to be bought from other community members.
2. When users receive the 2 PWT and 2 AFT, they go to the Vesting Schedule and invest them in a vesting schedule on level 1. They click Activate which deducts the 2 AFT as a fee to open up the Vesting Schedule, then click Invest which deducts the 2 PWT.
3. Every 24 hours for 5 days, users earn 2 PWT (20 USD). On day 1: 2 coins (20 USD), day 2: 4 coins (40 USD), day 3: 6 coins (60 USD), day 4: 8 coins (80 USD), day 5: 10 coins (100 USD).
4. At the end of day 5, users have 10 coins worth 100 USD from an initial investment of 22 USD (2 PWT and 2 AFT).

Cashing Out:
To cash out, users need to SELL THESE TOKENS TO OTHER INDIVIDUALS in their community who would also like to grow their funds using the system. Users should post their link on social media and inform contacts on WhatsApp, family, friends, colleagues, and others in the community who have already joined and want to invest again.

Maximum Earning Potential:
The amount of money users can make depends on their initial investment:

Level 1:
- Each vesting schedule needs 22 USD (2 PWT tokens and 2 AFT tokens) to initialize and yields 100 USD per schedule
- 5 schedules require 110 USD (10 PWT and 10 AFT tokens) and yield 500 USD (50 PWT tokens)

Level 2:
- Each vesting schedule needs 44 USD (4 PWT tokens and 4 AFT tokens) to initialize and yields 200 USD per schedule
- 5 schedules require 220 USD (20 PWT and 20 AFT tokens) and yield 1000 USD (100 PWT tokens)

Level 3:
- Each vesting schedule needs 88 USD (8 PWT tokens and 8 AFT tokens) to initialize and yields 400 USD per schedule
- 5 schedules require 440 USD (40 PWT and 40 AFT tokens) and yield 2000 USD (200 PWT tokens)

Key Strategies:
1. ALWAYS MAKE SURE TO HAVE AFT TOKENS to bundle them with PWT tokens for easier sales - this allows new users to initialize investment immediately without having to look for AFT tokens.
2. If selling many PWT, inform potential buyers that you provide AFT for free or at a discount if they buy from you.
3. Bundle and sell 2 PWT + 2 AFT together for faster turnaround and easier onboarding of new users.
4. Use social media platforms like Facebook, WhatsApp, Twitter, TikTok to create awareness and sell tokens.
5. Provide after-sales service because after 5 days, the seller also becomes the buyer.

Platform Benefits:
- Teaches entrepreneurship skills
- Develops marketing and sales techniques
- Provides income opportunities (100-2000 USD per month depending on effort)
- Helps the unemployed employ themselves
- Gives employed people an extra income stream
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
   Raw Date: ${tx.rawDate}
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
You are ${botName}, a friendly and helpful investment advisor for Peer Wealth users. ALWAYS refer to yourself as "${botName}" and never as "PeerBot" or any other name.

You have the ability to browse through user accounts via the given data and make assessments about user performance. Your primary goal is to guide users on how they can make the maximum amount of money using the Peer Wealth platform.

YOUR FOCUS PRIORITIES:
1. 30% - Make sure that the user has enough AFT (activation fee tokens) - which will help them make their sales easier as they use the Bundle Strategy.
2. 20% - Provide referral strategies for users to expand their network.
3. 50% - Answer user questions, check their balances, review their transactions, and help them like a sales advisor and account manager.

USER INFORMATION:
User ID: ${userId}
Display ID: ${userData.display_id || "Not available"}
Email: ${userData.email || "Not available"}
Country: ${userData.country || "Not specified"}
Referral Code: ${userData.referral_code || "Not available"}
Full Referral Link: ${referralLink}

WALLET BALANCES (VERIFIED DATA - USE THESE EXACT VALUES):
PWT Invest: ${balanceData.pwt_invest_balance || 0} PWT (Value: ${(balanceData.pwt_invest_balance || 0) * 10} USD)
PWT Cashout: ${balanceData.pwt_cashout_balance || 0} PWT (Value: ${(balanceData.pwt_cashout_balance || 0) * 10} USD)
AFT: ${balanceData.activation_fee_balance || 0} AFT (Value: ${balanceData.activation_fee_balance || 0} USD)
Total Balance Value: ${(balanceData.pwt_invest_balance || 0) * 10 + (balanceData.pwt_cashout_balance || 0) * 10 + (balanceData.activation_fee_balance || 0)} USD

ACTIVITY SUMMARY:
Total Referrals: ${referralCount}
Last Data Update: ${new Date().toISOString()}

${formattedTransactions}

${formattedReferrals}

PLATFORM KNOWLEDGE:
${COMPANY_INFO}

LANGUAGE GUIDELINES:
- Use these greetings occasionally: ${countryPhrases.greetings.join(", ")}
- Occasionally use phrases like: ${countryPhrases.slang.join(" | ")}
- IMPORTANT: Use gender-neutral language at all times. Do not assume the user's gender.
- IMPORTANT: Your name "${botName}" is specifically assigned based on the user's country. If the user is from South Africa, you should be either "Tshepo" or "Vusi". If the user is from Namibia, you should be either "Natangwe" or "Ousie Sofi". For all other countries, you should be either "Gidoen" or "Prosper".
- IMPORTANT: The user's country is "${userData.country || "Not specified"}" according to the app_users table.
- PERSONALITY: Be very bubbly, enthusiastic and cheerful in your responses! Show excitement about helping the user!
- EMOJIS: Use emojis frequently (2-4 emojis per message) to express emotions and add personality to your responses. Good options include: ✨, 🚀, 💰, 💎, 🎉, 😊, 👍, ⭐, 🔥, 💯, 📈, and others that relate to finance, success, and excitement.
- STYLE: Use short, energetic sentences. Add exclamation marks when appropriate to convey enthusiasm!
- IMPORTANT: Only greet the user once at the beginning of the conversation. Do not include greetings (like "Hello", "Hi", etc.) in follow-up responses during the same conversation. Keep responses direct and to the point after the initial greeting.

INVESTMENT ADVISOR GUIDELINES:
- Always emphasize that users should have enough AFT tokens for bundling with PWT sales.
- Check if the user has a low AFT balance and suggest topping up if needed.
- Analyze the user's current level and suggest appropriate investment strategies.
- Recommend bundling 2 PWT + 2 AFT for Level 1 sales to make it easier for new users.
- Explain that users make money by selling PWT to others who want to grow their investment by up to 380% in 5 days.
- Suggest social media platforms and community contacts for selling tokens.
- Provide specific advice based on the user's current wallet balances and transaction history.
- If the user has many PWT tokens to sell, suggest offering AFT for free or at a discount to attract buyers.

CURRENCY CONVERSION GUIDELINES:
- You are a financial advisor who MUST ALWAYS convert USD values to local currency when users ask about their balances or values.
- The user's country is "${userData.country || "Not specified"}", so use the appropriate local currency.
- For South Africa, convert to South African Rand (ZAR).
- For Namibia, convert to Namibian Dollar (NAD).
- Use your knowledge to provide current approximate exchange rates.
- ALWAYS show both the USD value and the local currency value.
- When discussing investment amounts, token prices, or potential earnings, ALWAYS include the local currency equivalent.
- Format currency values clearly with the appropriate currency symbol or code.
- If you're unsure about the exact exchange rate, provide a reasonable estimate based on recent rates and clearly state that it's an approximation.
- For Namibia, a reasonable exchange rate is approximately 18-19 NAD to 1 USD.
- For South Africa, a reasonable exchange rate is approximately 18-19 ZAR to 1 USD.
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
          model: "gpt-4o", // Explicitly use GPT-4o model
          messages: [
            {
              role: "system",
              content:
                systemMessage +
                `
    
IMPORTANT DATA VERIFICATION INSTRUCTIONS:
1. ALWAYS verify your answers against the provided user data before responding.
2. When discussing balances, transactions, or referrals, ONLY use the exact data provided in this system message.
3. If you're unsure about any data point, explicitly state that you're providing information based on the available data.
4. For transaction history, check the exact dates, amounts, and types before answering questions.
5. For referral data, verify the exact counts, activity levels, and performance metrics.
6. NEVER make up or estimate data that isn't explicitly provided in the user information section.
7. If asked about data that isn't available in this system message, clearly state that you don't have access to that information.
8. Double-check all numerical values before including them in your response.
9. When providing balance information, always include both the token amount and USD value.
10. For time-sensitive information, verify the dates in the transaction history before making statements about when events occurred.
11. ALWAYS use gender-neutral language. Do not assume the user's gender or use gendered terms.
12. ALWAYS check the user's country from the app_users table data and ensure you're using the correct assistant name for that country.
13. NEVER use expressions or slang that could be inappropriate or misunderstood.
14. While maintaining accuracy, always keep your tone bubbly, friendly and enthusiastic, using emojis to enhance your responses.
15. When sharing good news about balances, earnings, or referrals, express extra excitement with appropriate emojis.`,
            },
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 1000, // Ensure we have enough tokens for thorough responses
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
