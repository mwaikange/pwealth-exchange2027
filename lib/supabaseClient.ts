import { createClient } from "@supabase/supabase-js"
import { env } from "./env"

// Ensure environment variables are available
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create a singleton instance
let supabaseInstance: ReturnType<typeof createClient> | null = null

// Function to get the Supabase client (singleton pattern)
const getSupabase = () => {
  if (!supabaseInstance) {
    console.log("Creating NEW Supabase client instance")

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: "supabase-auth-token",
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } else {
    console.log("Reusing existing Supabase client instance")
  }

  return supabaseInstance
}

// Export the singleton client
export const supabase = getSupabase()

// Re-export the singleton instance
// import { supabase } from "./supabase-singleton" // Removed as it creates a circular dependency

// For backwards compatibility
// export const getSupabase = () => supabase // Removed duplicate declaration
