import { createServerSupabaseClient } from "./supabase-server"

/**
 * Fetch user data securely for the chatbot.
 * @param userId The user's UUID
 * @returns User data object or null if not found
 */
export async function getUserData(userId: string) {
  try {
    const supabase = createServerSupabaseClient()

    // Get basic user data from app_users table
    const { data: userData, error: userError } = await supabase
      .from("app_users")
      .select("email, country, display_id, referral_code, status")
      .eq("user_uuid", userId) // Using user_uuid instead of id
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
      return null
    }

    // Get wallet balances from balances table
    const { data: balanceData } = await supabase
      .from("balances") // Using balances instead of wallet_balances
      .select("pwt_invest_balance, pwt_cashout_balance, activation_fee_balance, display_id")
      .eq("user_uuid", userId)
      .single()

    // Get recent transactions
    const { data: transactionsData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_uuid", userId)
      .order("created_at", { ascending: false })
      .limit(10)

    // Get vesting schedules
    const { data: vestingData } = await supabase.from("vesting_schedules").select("*").eq("user_uuid", userId)

    // Get referrals
    const { data: referralsData } = await supabase.from("referrals").select("*").eq("referrer_uuid", userId) // This seems correct based on your schema

    return {
      userData,
      balances: balanceData || {
        pwt_invest_balance: 0,
        pwt_cashout_balance: 0,
        activation_fee_balance: 0, // Using activation_fee_balance instead of aft_balance
      },
      transactions: transactionsData || [],
      vestingSchedules: vestingData || [],
      referrals: referralsData || [],
      referralCount: referralsData?.length || 0,
      activeVestingCount: vestingData?.filter((v: any) => v.invested && !v.claimed)?.length || 0, // Better check for active
    }
  } catch (error) {
    console.error("Error in getUserData:", error)
    return null
  }
}
