"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function getUserProfile(userId: string) {
  const supabase = createServerSupabaseClient()

  try {
    const { data, error } = await supabase.from("app_users").select("*").eq("id", userId).single()

    if (error) {
      console.error("Get user profile error:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Get user profile failed:", error)
    throw error
  }
}

export async function updateUserReferrer(userId: string, referrerCode: string) {
  const supabase = createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("app_users")
      .update({ referrer_code: referrerCode })
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      console.error("Update referrer error:", error)
      throw error
    }

    revalidatePath("/dashboard/settings")
    return data
  } catch (error) {
    console.error("Update referrer failed:", error)
    throw error
  }
}

export async function getUserStats(userId: string) {
  const supabase = createServerSupabaseClient()

  try {
    // Get user's referral count
    const { count: referralCount, error: referralError } = await supabase
      .from("app_users")
      .select("*", { count: "exact", head: true })
      .eq("referrer_code", userId)

    if (referralError) {
      console.error("Get referral count error:", referralError)
    }

    // Get user's transaction count
    const { count: transactionCount, error: transactionError } = await supabase
      .from("payment_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    if (transactionError) {
      console.error("Get transaction count error:", transactionError)
    }

    return {
      referralCount: referralCount || 0,
      transactionCount: transactionCount || 0,
    }
  } catch (error) {
    console.error("Get user stats failed:", error)
    return {
      referralCount: 0,
      transactionCount: 0,
    }
  }
}
