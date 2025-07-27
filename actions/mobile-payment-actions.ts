"use server"

import { createAdminClient } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

// Function to refresh a user's session on the server
export async function refreshUserSession() {
  try {
    // This is a placeholder for actual session refresh logic
    return { success: true }
  } catch (error) {
    console.error("Error refreshing user session:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Function to handle mobile payment form submission
export async function submitMobilePayment(userId: string, formData: FormData) {
  try {
    console.log("Starting payment submission with userId:", userId)

    // Create admin client to bypass RLS
    const adminClient = createAdminClient()

    // Validate userId exists
    if (!userId) {
      console.error("Missing user ID")
      return { success: false, message: "Missing user ID. You must be logged in." }
    }

    // Extract form data
    const bankId = formData.get("bankId") as string
    const networkId = formData.get("networkId") as string
    const name = (formData.get("name") as string) || null
    const transactionDate = (formData.get("transactionDate") as string) || null
    const referenceNumber = (formData.get("referenceNumber") as string) || null
    const amount = Number.parseFloat(formData.get("amount") as string) || 0
    const localAmount = Number.parseFloat(formData.get("localAmount") as string) || 0
    const mobileNumber = (formData.get("mobileNumber") as string) || null
    const screenshot = formData.get("screenshot") as File

    console.log("Form data extracted:", {
      bankId,
      networkId,
      name: name ? "provided" : "not provided",
      transactionDate: transactionDate ? "provided" : "not provided",
      referenceNumber: referenceNumber ? "provided" : "not provided",
      amount,
      localAmount,
      mobileNumber: mobileNumber ? "provided" : "not provided",
      screenshot: screenshot ? "provided" : "not provided",
    })

    // Validate required fields
    if (!bankId) {
      console.error("Missing bank ID")
      return { success: false, message: "Bank ID is required to submit a payment." }
    }

    if (amount <= 0) {
      console.error("Invalid amount")
      return { success: false, message: "Please enter a valid amount." }
    }

    // Convert bankId to a number
    const bankIdNumber = Number(bankId)
    if (isNaN(bankIdNumber)) {
      console.error("Invalid bank ID format")
      return { success: false, message: "Invalid bank ID format." }
    }

    // Convert networkId to a number (if provided)
    let networkIdNumber = null
    if (networkId) {
      networkIdNumber = Number(networkId)
      if (isNaN(networkIdNumber)) {
        console.error("Invalid network ID format")
        return { success: false, message: "Invalid network ID format." }
      }
    }

    // Upload screenshot if provided
    let screenshotUrl = null
    if (screenshot && screenshot.size > 0) {
      console.log("Uploading screenshot...")
      const fileExt = screenshot.name.split(".").pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await adminClient.storage
        .from("payment_screenshots")
        .upload(fileName, screenshot, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        console.error("Error uploading screenshot:", uploadError)
        return { success: false, message: "Failed to upload screenshot: " + uploadError.message }
      }

      const {
        data: { publicUrl },
      } = adminClient.storage.from("payment_screenshots").getPublicUrl(fileName)

      screenshotUrl = publicUrl
      console.log("Screenshot uploaded successfully:", screenshotUrl)
    }

    // Prepare the transaction date
    let transactionDateTime = null
    if (transactionDate) {
      transactionDateTime = new Date(transactionDate)
      if (isNaN(transactionDateTime.getTime())) {
        console.error("Invalid transaction date format")
        return { success: false, message: "Invalid transaction date format." }
      }
    } else {
      // Use current date if not provided
      transactionDateTime = new Date()
    }

    // Format the date as ISO string
    const isoDate = transactionDateTime.toISOString()

    // Insert payment submission using admin client to bypass RLS
    console.log("Inserting payment submission...")

    // Map fields to their correct columns in the database
    const insertData = {
      user_id: userId,
      bank_id: bankIdNumber,
      network_id: networkIdNumber, // Add network_id as a number
      amount: localAmount,
      reference_number: referenceNumber,
      sender_mobile: mobileNumber,
      screenshot_url: screenshotUrl,
      notes: `USD Amount: ${amount}`,
      name: name,
      created_at: isoDate, // Set created_at to the transaction date
      date: isoDate, // Also set date column to the same value
    }

    console.log("Full insert data:", insertData)

    const { data, error } = await adminClient.from("pay_submissions").insert(insertData).select()

    if (error) {
      console.error("Error inserting payment submission:", error)
      return { success: false, message: "Failed to submit payment: " + error.message }
    }

    console.log("Payment submitted successfully:", data)
    revalidatePath("/dashboard")
    return { success: true, message: "Payment submitted successfully!" }
  } catch (error) {
    console.error("Exception in submitMobilePayment:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}
