import { createServerSupabaseClient } from "@/lib/supabase-server"

// Define the pattern handler type
interface PatternHandler {
  patterns: string[]
  handler: (userId: string) => Promise<string | null>
}

// Get user's balance
async function getBalanceHandler(userId: string): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("balances")
      .select("pwt_invest_balance, pwt_cashout_balance, activation_fee_balance")
      .eq("user_uuid", userId)
      .single()

    if (error || !data) {
      return null
    }

    return `Your current balances are:
      
PWT Invest: ${data.pwt_invest_balance} PWT (${data.pwt_invest_balance * 10} USD)
PWT Cashout: ${data.pwt_cashout_balance} PWT (${data.pwt_cashout_balance * 10} USD)
AFT: ${data.activation_fee_balance} AFT (${data.activation_fee_balance} USD)`
  } catch (error) {
    console.error("Error in balance handler:", error)
    return null
  }
}

// Get user's referral link
async function getReferralLinkHandler(userId: string): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from("app_users").select("referral_code").eq("user_uuid", userId).single()

    if (error || !data || !data.referral_code) {
      return null
    }

    return `Your referral link is: www.peer-wealth.com/register?ref=${data.referral_code}
    
Share this link with friends and family to earn rewards when they join and participate in Peer Wealth!`
  } catch (error) {
    console.error("Error in referral link handler:", error)
    return null
  }
}

// Get user's referral count
async function getReferralCountHandler(userId: string): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { count, error } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("user_uuid", userId)

    if (error || count === null) {
      return null
    }

    return `You currently have ${count} referrals.
    
${count === 0 ? "You haven't referred anyone yet. Share your referral link to start earning rewards!" : "Keep growing your network to increase your earnings!"}`
  } catch (error) {
    console.error("Error in referral count handler:", error)
    return null
  }
}

// Get user's transaction count
async function getTransactionCountHandler(userId: string): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { count, error } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_uuid", userId)

    if (error || count === null) {
      return null
    }

    return `You have made ${count} transactions on the platform.`
  } catch (error) {
    console.error("Error in transaction count handler:", error)
    return null
  }
}

// Get user's vesting progress
async function getVestingProgressHandler(userId: string): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("progression_levels")
      .select("level1_progress, level2_progress, level3_progress")
      .eq("user_uuid", userId)
      .single()

    if (error || !data) {
      return null
    }

    return `Your current vesting progress:
    
Level 1: ${data.level1_progress || 0}% complete
Level 2: ${data.level2_progress || 0}% complete
Level 3: ${data.level3_progress || 0}% complete`
  } catch (error) {
    console.error("Error in vesting progress handler:", error)
    return null
  }
}

// Define all pattern handlers
export const PATTERN_HANDLERS: PatternHandler[] = [
  {
    patterns: [
      "what is my balance",
      "how much pwt do i have",
      "show me my balance",
      "what is my wallet balance",
      "how much aft do i have",
      "check my balance",
    ],
    handler: getBalanceHandler,
  },
  {
    patterns: [
      "what is my referral link",
      "show me my referral link",
      "how do i refer someone",
      "where is my referral code",
      "give me my referral link",
    ],
    handler: getReferralLinkHandler,
  },
  {
    patterns: ["how many referrals do i have", "show me my referrals", "referral count", "number of referrals"],
    handler: getReferralCountHandler,
  },
  {
    patterns: ["how many transactions", "transaction count", "number of transactions"],
    handler: getTransactionCountHandler,
  },
  {
    patterns: ["vesting progress", "level progress", "how far am i", "progression status", "show me my progress"],
    handler: getVestingProgressHandler,
  },
  {
    patterns: [
      "whatsapp",
      "whatsapp group",
      "whatsapp community",
      "community",
      "chat group",
      "sell tokens",
      "selling strategy",
      "how to sell",
      "token sales",
      "marketplace",
      "buy and sell",
      "trading group",
      "peer community",
      "groups to join",
      "networks",
      "communities",
      "join group",
      "join community",
      "join network",
    ],
    handler: async () => {
      return `📱 **PeerWealthNetwork WhatsApp Community**

Join our official PeerWealthNetwork WhatsApp community for:
- Latest updates and announcements
- Buy and sell opportunities for your tokens
- Trading strategies and market insights
- Direct communication with other community members
- Support from experienced traders

**Join link**: https://chat.whatsapp.com/JlEcYCQCbD21a3ldDd9mTJ

This is the best place to learn about selling your tokens, connecting with potential buyers, and staying updated with the latest Peer Wealth news!`
    },
  },
]

// Try to get a rule-based response
export async function getRuleBasedResponse(question: string, userId: string): Promise<string | null> {
  const normalizedQuestion = question.toLowerCase().trim()

  for (const patternHandler of PATTERN_HANDLERS) {
    if (patternHandler.patterns.some((pattern) => normalizedQuestion.includes(pattern))) {
      try {
        const response = await patternHandler.handler(userId)
        return response
      } catch (error) {
        console.error("Error in rule-based response handler:", error)
      }
    }
  }

  return null // No matching pattern found
}
