import { createClient } from "@supabase/supabase-js"
import { clientEnv } from "./env"

// Ensure we only use NEXT_PUBLIC_ environment variables on client
const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

// Create singleton instance for client-side usage
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (typeof window === "undefined") {
    // Server-side: always create new instance
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  }

  // Client-side: use singleton
  if (!supabaseInstance) {
    console.log("Supabase singleton initialized")
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: "supabase-auth-token",
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return supabaseInstance
}

// Export the singleton
export const supabase = getSupabaseClient()
