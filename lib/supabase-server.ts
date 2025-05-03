import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { env } from "./env"
import type { Database } from "@/types/supabase"

// Re-export createClient from @supabase/supabase-js
export { createClient } from "@supabase/supabase-js"

// Create a Supabase client for server components
export const createServerSupabaseClient = () => {
  try {
    const cookieStore = cookies()
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
      })
      return null
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    })
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    return null
  }
}

// Also export the function with the new name for backward compatibility
export const createServerClient = createServerSupabaseClient
