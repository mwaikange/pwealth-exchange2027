import { createClient } from "@supabase/supabase-js"

// Ensure environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

// Check if we're running on the client side
const isClient = typeof window !== "undefined"

// Create a singleton instance for the client side
let supabaseInstance: ReturnType<typeof createClient> | null = null

// Function to get the Supabase client (singleton pattern)
export const getSupabaseClient = () => {
  if (isClient) {
    // For client-side, maintain a singleton instance
    if (!supabaseInstance) {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          storageKey: "supabase_auth_token",
        },
      })
    }
    return supabaseInstance
  }

  // For server-side, always create a new instance
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
