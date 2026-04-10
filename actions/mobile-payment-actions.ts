"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

// Function to handle mobile payment form submission
export async function submitMobilePayment(formData: FormData) {
  const supabase = createServerSupabaseClient()

  try {
    // Get form data
    const countryId = formData.get("countryId") as string
    const bankId = formData.get("bankId") as string
    const amount = Number.parseFloat(formData.get("amount") as string)
    const name = formData.get("name") as string
    const transactionDate = formData.get("transaction_date") as string
    const referenceNumber = formData.get("reference_number") as string
    const mobileNumber = formData.get("mobile_number") as string
    const aftTokenAmount = Number.parseFloat(formData.get("aft_token_amount") as string)

    // Handle file upload
    const screenshot = formData.get("screenshot") as File
    let screenshotUrl = null

    if (screenshot && screenshot.size > 0) {
      const fileName = `${Date.now()}-${screenshot.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(fileName, screenshot)

      if (uploadError) {
        console.error("Screenshot upload error:", uploadError)
        return { success: false, error: "Failed to upload screenshot" }
      }

      screenshotUrl = uploadData.path
    }

    // Insert payment submission
    const { data, error } = await supabase
      .from("pay_submissions")
      .insert({
        country_id: countryId,
        bank_id: bankId,
        amount: amount,
        name: name,
        transaction_date: transactionDate,
        reference_number: referenceNumber,
        mobile_number: mobileNumber,
        screenshot_url: screenshotUrl,
        aft_token_amount: aftTokenAmount,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Payment submission error:", error)
      return { success: false, error: "Failed to submit payment" }
    }

    revalidatePath("/dashboard")
    return { success: true, data }
  } catch (error) {
    console.error("Mobile payment submission error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Function to refresh a user's session on the server
export async function refreshUserSession() {
  const supabase = createServerSupabaseClient()

  try {
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error("Session refresh error:", error)
      return { success: false, error: error.message }
    }

    return { success: true, session: data.session }
  } catch (error) {
    console.error("Session refresh failed:", error)
    return { success: false, error: "Failed to refresh session" }
  }
}
