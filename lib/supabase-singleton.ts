import { createClient } from "@supabase/supabase-js"
import { env } from "./env"

// Ensure environment variables are available
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Define a type for our singleton
type SupabaseClientSingleton = ReturnType<typeof createClient> | null

// Create a singleton store that works in both browser and server environments
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClientSingleton
}

// Check if we already have an instance
if (!globalForSupabase.supabase) {
  // Create a new client if one doesn't exist
  globalForSupabase.supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: "supabase-auth-token",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  console.log("Supabase singleton initialized")
}

// Export the singleton instance
export const supabase = globalForSupabase.supabase!
