"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function updateReferrer(formData: FormData) {
  try {
    const supabase = createServerSupabaseClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in to update your referrer" }
    }

    const referrerEmail = formData.get("referrerEmail") as string

    // Validate referrer email if provided
    if (referrerEmail && !referrerEmail.includes("@")) {
      return { error: "Invalid referrer email format" }
    }

    // Check if referrer exists in the system
    if (referrerEmail) {
      const { data: referrer, error: referrerError } = await supabase
        .from("app_users")
        .select("user_uuid")
        .eq("email", referrerEmail)
        .single()

      if (referrerError || !referrer) {
        return { error: "Referrer not found in our system" }
      }
    }

    // Update the referrer in the referrals table
    const { error } = await supabase.from("referrals").upsert(
      {
        user_uuid: user.id,
        referrer_email: referrerEmail || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_uuid",
      },
    )

    if (error) {
      console.error("Error updating referrer:", error)
      return { error: "Failed to update referrer" }
    }

    revalidatePath("/dashboard/settings")
    return { success: "Referrer updated successfully" }
  } catch (error) {
    console.error("Error in updateReferrer:", error)
    return { error: "An unexpected error occurred" }
  }
}
