import { createClient } from "@supabase/supabase-js"
import { env } from "./env"

// Ensure environment variables are available
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if we're running on the client side
const isClient = typeof window !== "undefined"

// Create a singleton instance for the client side
let supabaseInstance: ReturnType<typeof createClient> | null = null

// Function to get the Supabase client (singleton pattern)
export const getSupabaseClient = () => {
  if (isClient) {
    // For client-side, maintain a singleton instance
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
    } else {
      console.log("Reusing existing Supabase client instance")
    }
    return supabaseInstance
  }

  // For server-side, always create a new instance
  console.log("Creating NEW Supabase client instance (server-side)")

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}

// Export the singleton client for client-side usage
export const supabase = getSupabaseClient()

// Create a server-side client (for server components and server actions)
export const createServerSupabaseClient = () => {
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

  console.log("Creating NEW Supabase server client instance")

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Re-export the singleton
// import { supabase } from "./supabase-singleton" // Removed redundant import

export default supabase
