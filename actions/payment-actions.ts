"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { PayBank, PayConfig, PayCountry, PayNetwork, PaySubmission } from "@/types/payment-types"
import { revalidatePath } from "next/cache"

// Helper function to create a properly configured Supabase client
function createClient() {
  return createServerActionClient({
    cookies,
    options: {
      global: {
        headers: {
          // Remove the object-specific accept header that's causing 406 errors
          Accept: "application/json",
        },
      },
    },
  })
}

// Get countries from the database
export async function getCountries(): Promise<PayCountry[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("pay_countries").select("*").order("name")

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching countries:", error)
    return []
  }
}

// Get banks for a specific country
export async function getBanksForCountry(countryId: string): Promise<PayBank[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("pay_banks").select("*").eq("country_id", countryId).order("name")

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching banks:", error)
    return []
  }
}

// Get networks for a specific country
export async function getNetworksForCountry(countryId: string): Promise<PayNetwork[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("pay_networks").select("*").eq("country_id", countryId).order("name")

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching networks:", error)
    return []
  }
}

// Get payment configuration for a country and bank
export async function getPaymentConfig(countryId: string, bankId?: string): Promise<PayConfig | null> {
  const supabase = createClient()

  try {
    // First, refresh the session to ensure we have a valid token
    const { error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error("Session error in getPaymentConfig:", sessionError)
      return null
    }

    let query = supabase.from("pay_configs").select("*").eq("country_id", countryId)

    if (bankId) {
      query = query.eq("bank_id", bankId)
    } else {
      query = query.is("bank_id", null)
    }

    // Use limit(1) instead of single() to avoid 406 errors
    const { data, error } = await query.limit(1)

    if (error) {
      console.error("Error in getPaymentConfig query:", error)
      return null
    }

    return data && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error("Error fetching payment config:", error)
    return null
  }
}

// Get user's payment submissions (limited to 12)
export async function getUserPaymentSubmissions(): Promise<PaySubmission[]> {
  const supabase = createClient()

  try {
    // First, refresh the session to ensure we have a valid token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error("Session error in getUserPaymentSubmissions:", sessionError)
      return []
    }

    const user = sessionData?.session?.user
    if (!user) {
      console.log("No authenticated user found in getUserPaymentSubmissions")
      return []
    }

    const { data, error } = await supabase
      .from("pay_submissions")
      .select(`
        *,
        pay_countries(name),
        pay_banks(name)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12)

    if (error) {
      console.error("Error fetching submissions:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching payment submissions:", error)
    return []
  }
}

// Submit a payment
export async function submitPayment(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()

  try {
    // Extract form data first, so we can proceed even if authentication fails
    const countryId = formData.get("countryId") as string
    const bankId = formData.get("bankId") as string
    const networkId = (formData.get("networkId") as string) || null
    const name = (formData.get("name") as string) || null
    const transactionDate = (formData.get("transactionDate") as string) || null
    const referenceNumber = (formData.get("referenceNumber") as string) || null
    const amount = Number.parseFloat((formData.get("amount") as string) || "0")
    const amountUsd = Number.parseFloat((formData.get("amountUsd") as string) || "0")
    const mobileNumber = (formData.get("mobileNumber") as string) || null
    const screenshot = formData.get("screenshot") as File | null

    // Validate required fields
    if (!countryId || !bankId || !amount) {
      return { success: false, message: "Missing required fields" }
    }

    // First, refresh the session to ensure we have a valid token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Session error:", sessionError)
      return {
        success: false,
        message: "Your session has expired. Please refresh the page and try again.",
      }
    }

    if (!sessionData.session) {
      console.log("No active session found")
      return {
        success: false,
        message: "You need to be logged in. Please refresh the page and log in again.",
      }
    }

    const user = sessionData.session.user
    if (!user || !user.id) {
      console.log("No user found in session")
      return {
        success: false,
        message: "Your user profile could not be loaded. Please log in again.",
      }
    }

    // Handle screenshot upload if provided
    let screenshotUrl = null
    if (screenshot && screenshot.size > 0) {
      const fileExt = screenshot.name.split(".").pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment_screenshots")
        .upload(fileName, screenshot, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        console.error("Screenshot upload error:", uploadError)
        return { success: false, message: "Failed to upload screenshot" }
      }

      // Get public URL
      const { data: urlData } = await supabase.storage.from("payment_screenshots").getPublicUrl(fileName)
      screenshotUrl = urlData.publicUrl
    }

    // Check if user has more than 12 submissions and delete the oldest one
    const { count, error: countError } = await supabase
      .from("pay_submissions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (countError) {
      console.error("Error counting submissions:", countError)
    }

    if (count && count >= 12) {
      const { data: oldestSubmission, error: oldestError } = await supabase
        .from("pay_submissions")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)

      if (oldestError) {
        console.error("Error finding oldest submission:", oldestError)
      }

      if (oldestSubmission && oldestSubmission.length > 0) {
        const { error: deleteError } = await supabase.from("pay_submissions").delete().eq("id", oldestSubmission[0].id)

        if (deleteError) {
          console.error("Error deleting oldest submission:", deleteError)
        }
      }
    }

    // Create payment submission
    const { data, error } = await supabase
      .from("pay_submissions")
      .insert({
        user_id: user.id,
        country_id: countryId,
        bank_id: bankId,
        network_id: networkId,
        name,
        transaction_date: transactionDate,
        reference_number: referenceNumber,
        amount,
        amount_usd: amountUsd,
        mobile_number: mobileNumber,
        screenshot_url: screenshotUrl,
        status: "pending",
      })
      .select()

    if (error) {
      console.error("Error inserting submission:", error)
      throw error
    }

    revalidatePath("/dashboard")
    return { success: true, message: "Payment submitted successfully" }
  } catch (error) {
    console.error("Error submitting payment:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}
