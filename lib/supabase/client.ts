import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"
import { env } from "../env"

// Create a single instance for client components
let clientInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null

export const getSupabaseClient = () => {
  // Check if environment variables are available and provide fallbacks
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || (typeof window !== "undefined" ? window.location.origin : "")
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-key"

  if (!supabaseUrl) {
    console.error("Supabase URL is missing. Please check your environment variables.")
  }

  if (typeof window === "undefined") {
    // Server-side: always create a new instance
    return createClientComponentClient<Database>({
      supabaseUrl,
      supabaseKey,
    })
  }

  // Client-side: maintain a singleton
  if (!clientInstance) {
    clientInstance = createClientComponentClient<Database>({
      supabaseUrl,
      supabaseKey,
    })
  }

  return clientInstance
}

// Export the singleton client
export const supabaseClient = getSupabaseClient()
