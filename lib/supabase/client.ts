import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"
import { env } from "../env"

// Create a single instance for client components
let clientInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null

export const getSupabaseClient = () => {
  if (typeof window === "undefined") {
    // Server-side: always create a new instance
    return createClientComponentClient<Database>({
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  }

  // Client-side: maintain a singleton
  if (!clientInstance) {
    clientInstance = createClientComponentClient<Database>({
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  }

  return clientInstance
}

// Export the singleton client
export const supabaseClient = getSupabaseClient()
