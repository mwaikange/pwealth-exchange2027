import { createClient } from "@supabase/supabase-js"
import { clientEnv } from "./env"

// Ensure we only use NEXT_PUBLIC_ environment variables on client
const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseAnonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

// Create singleton instance for client-side usage
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (typeof window === "undefined") {
    // Server-side: create new instance each time
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
export default supabase
