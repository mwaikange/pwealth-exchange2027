"use server"

import { cookies } from "next/headers"
import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

export async function checkRlsStatus() {
  const supabase = createServerActionClient<Database>({ cookies })

  try {
    // Check if RLS is enabled on pay_submissions table
    const { data: rlsData, error: rlsError } = await supabase.rpc("check_rls_enabled", {
      table_name: "pay_submissions",
    })

    if (rlsError) {
      console.error("Error checking RLS status:", rlsError)
      return {
        success: false,
        error: rlsError.message,
      }
    }

    // Get policies for pay_submissions table
    const { data: policiesData, error: policiesError } = await supabase.rpc("get_policies_for_table", {
      table_name: "pay_submissions",
    })

    if (policiesError) {
      console.error("Error getting policies:", policiesError)
      return {
        success: true,
        rls: rlsData,
        policies: [],
        error: policiesError.message,
      }
    }

    return {
      success: true,
      rls: rlsData,
      policies: policiesData,
    }
  } catch (error) {
    console.error("Error in checkRlsStatus:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
