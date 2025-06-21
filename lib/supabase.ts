import { createClient } from "@supabase/supabase-js"
import { clientEnv, serverEnv } from "./env"

// Client-side Supabase client (only uses NEXT_PUBLIC_ variables)
const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing required Supabase environment variables")
}

// Create client instance
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (typeof window !== "undefined") {
    // Client-side: maintain singleton
    if (!supabaseInstance) {
      console.log("Creating NEW Supabase client instance (client-side)")
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          storageKey: "supabase_auth_token",
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    }
    return supabaseInstance
  }

  // Server-side: always create new instance
  console.log("Creating NEW Supabase client instance (server-side)")
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}

// Export the client
export const supabase = getSupabaseClient()

// Create server-side client (for server components and server actions)
export const createServerSupabaseClient = () => {
  const supabaseServiceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY

  console.log("Creating NEW Supabase server client instance")

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export default supabase
