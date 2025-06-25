import { createClient } from "@supabase/supabase-js"
import { clientEnv } from "../env"
import type { Database } from "@/types/supabase"

// Create a single instance for client components
let clientInstance: ReturnType<typeof createClient<Database>> | null = null

export const getSupabaseClient = () => {
  const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing required Supabase environment variables")
    throw new Error("Supabase configuration is missing")
  }

  if (typeof window === "undefined") {
    // Server-side: always create a new instance
    return createClient<Database>(supabaseUrl, supabaseKey)
  }

  // Client-side: maintain a singleton
  if (!clientInstance) {
    clientInstance = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return clientInstance
}

// Export the singleton client
export const supabaseClient = getSupabaseClient()
