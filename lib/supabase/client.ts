import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Create a single instance for client components
let clientInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null

export const getSupabaseClient = () => {
  if (typeof window === "undefined") {
    // Server-side: always create a new instance
    return createClientComponentClient<Database>()
  }

  // Client-side: maintain a singleton
  if (!clientInstance) {
    clientInstance = createClientComponentClient<Database>()
  }

  return clientInstance
}

// Export the singleton client
export const supabaseClient = getSupabaseClient()
