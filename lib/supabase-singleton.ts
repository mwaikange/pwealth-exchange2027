import { createClient } from "@supabase/supabase-js"
import { clientEnv } from "./env"
import type { Database } from "@/types/supabase"

// Create a singleton Supabase client for the browser
function createSupabaseClient() {
  if (!clientEnv.NEXT_PUBLIC_SUPABASE_URL || !clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("⚠️ Supabase configuration missing")
    // Return a mock client for development
    return null
  }

  console.log("🔧 Creating Supabase client:", {
    url: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  return createClient<Database>(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: {
      headers: {
        "X-Client-Info": "peer-wealth@1.0.0",
      },
    },
  })
}

// Export the singleton instance
export const supabase = createSupabaseClient()

// Helper function that throws if not configured
export function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please check your environment variables.")
  }
  return supabase
}

// Export for backwards compatibility
export default supabase
