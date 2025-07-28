"use server"

import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase"
import type { PayBank, PayConfig, PayCountry, PayNetwork, PaySubmission } from "@/types/payment-types"
import { revalidatePath } from "next/cache"

// Get countries from the database
export async function getCountries(): Promise<PayCountry[]> {
  const supabase = createAdminClient()

  try {
    console.log("Getting countries...")

    const { data, error } = await supabase.from("pay_countries").select("*").order("name")

    if (error) {
      console.error("Error fetching countries:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error fetching countries:", error)
    return []
  }
}

// Get banks for a specific country
export async function getBanksForCountry(countryId: string): Promise<PayBank[]> {
  const supabase = createAdminClient()

  try {
    console.log("Getting banks for country:", countryId)

    const { data, error } = await supabase.from("pay_banks").select("*").eq("country_id", countryId).order("name")

    if (error) {
      console.error("Error fetching banks:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error fetching banks:", error)
    return []
  }
}

// Get networks for a specific country
export async function getNetworksForCountry(countryId: string): Promise<PayNetwork[]> {
  const supabase = createAdminClient()

  try {
    console.log("Getting networks for country:", countryId)

    const { data, error } = await supabase.from("pay_networks").select("*").eq("country_id", countryId).order("name")

    if (error) {
      console.error("Error fetching networks:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error fetching networks:", error)
    return []
  }
}

// Get payment configuration for a country and bank
export async function getPaymentConfig(countryId: string, bankId?: string): Promise<PayConfig | null> {
  const supabase = createAdminClient()

  try {
    console.log("Getting payment config for country:", countryId, "and bank:", bankId || "null")

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
export async function getUserPaymentSubmissions(userId: string): Promise<PaySubmission[]> {
  const supabase = createAdminClient()

  try {
    console.log("Getting user payment submissions for user:", userId)

    // If no userId is provided, return empty array
    if (!userId) {
      console.log("No userId provided, returning empty array")
      return []
    }

    // Updated select clause to remove pay_countries reference
    const { data, error } = await supabase
      .from("pay_submissions")
      .select("*, pay_banks(name)")
      .eq("user_id", userId)
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

// Helper function to get exchange rate for a country
function getExchangeRate(countryId: string): number {
  // Default exchange rates - in a production app, these would come from a database or API
  const exchangeRates: Record<string, number> = {
    "1": 18.5, // Namibia (NAD)
    "2": 19.2, // South Africa (ZAR)
    "3": 13.7, // Botswana (Pula)
    // Add more countries as needed
  }

  return exchangeRates[countryId] || 18.5 // Default to Namibian exchange rate if not found
}

// Submit a payment
export async function submitPayment(
  userId: string,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient()

  try {
    console.log("Submitting payment for user:", userId)

    // If no userId is provided, return error
    if (!userId) {
      console.log("No userId provided, returning error")
      return {
        success: false,
        message: "You need to be logged in to submit a payment.",
      }
    }

    // Extract form data
    const countryId = formData.get("countryId") as string
    const bankId = formData.get("bankId") as string
    const networkId = (formData.get("networkId") as string) || null
    const name = (formData.get("name") as string) || null
    const transactionDate = (formData.get("transactionDate") as string) || null
    const referenceNumber = (formData.get("referenceNumber") as string) || null
    const amountUsd = Number.parseFloat((formData.get("amount") as string) || "0")
    const mobileNumber = (formData.get("mobileNumber") as string) || null
    const screenshot = formData.get("screenshot") as File | null

    // Get the exchange rate for the selected country
    const exchangeRate = getExchangeRate(countryId)

    // Calculate local amount from USD amount
    const localAmount = amountUsd * exchangeRate

    // Validate required fields
    if (!countryId || !bankId || !amountUsd) {
      return { success: false, message: "Missing required fields" }
    }

    // Get the config_id if available
    let configId = null
    if (bankId && countryId) {
      const config = await getPaymentConfig(countryId, bankId)
      configId = config?.id || null
    }

    // Handle screenshot upload if provided
    let screenshotUrl = null
    if (screenshot && screenshot.size > 0) {
      const fileExt = screenshot.name.split(".").pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

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
      .eq("user_id", userId)

    if (countError) {
      console.error("Error counting submissions:", countError)
    }

    if (count && count >= 12) {
      const { data: oldestSubmission, error: oldestError } = await supabase
        .from("pay_submissions")
        .select("id")
        .eq("user_id", userId)
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

    // Create payment submission with exact column names from the schema
    // Using the admin client to bypass RLS
    const { data, error } = await supabase
      .from("pay_submissions")
      .insert({
        user_id: userId,
        config_id: configId,
        bank_id: Number.parseInt(bankId),
        network_id: networkId ? Number.parseInt(networkId) : null,
        date: transactionDate,
        amount: localAmount, // Store local currency amount instead of USD
        status: "Pending", // Changed to "Pending" with capital P to match the constraint
        name: name,
        reference_number: referenceNumber,
        sender_mobile: mobileNumber,
        screenshot_url: screenshotUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: `USD Amount: ${amountUsd}`, // Store USD amount in notes for reference
      })
      .select()

    if (error) {
      console.error("Error inserting submission:", error)
      throw error
    }

    // Log the successful insertion
    console.log("Payment submission created successfully:", data)

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

// Process a payment
export async function processPayment(formData: FormData) {
  const supabase = createServerSupabaseClient()

  try {
    const amount = Number.parseFloat(formData.get("amount") as string)
    const paymentMethod = formData.get("paymentMethod") as string
    const userId = formData.get("userId") as string

    // Process the payment logic here
    const { data, error } = await supabase
      .from("payment_transactions")
      .insert({
        user_id: userId,
        amount: amount,
        payment_method: paymentMethod,
        status: "completed",
      })
      .select()
      .single()

    if (error) {
      console.error("Payment processing error:", error)
      return { success: false, error: "Failed to process payment" }
    }

    revalidatePath("/dashboard")
    return { success: true, data }
  } catch (error) {
    console.error("Payment processing failed:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
