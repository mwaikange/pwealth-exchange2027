import { createClient } from "@supabase/supabase-js"
import { env } from "./env"

// Use the actual environment variables from the workspace
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

// Validate required variables
if (!supabaseUrl || supabaseUrl.trim() === "") {
  console.error("Missing Supabase URL. Check environment variables.")
  throw new Error("Supabase URL is required")
}

if (!supabaseAnonKey || supabaseAnonKey.trim() === "") {
  console.error("Missing Supabase Anon Key. Check environment variables.")
  throw new Error("Supabase Anon Key is required")
}

console.log("Supabase initialized with:", {
  url: supabaseUrl,
  anonKeyPresent: !!supabaseAnonKey,
  serviceKeyPresent: !!supabaseServiceKey,
})

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
  console.log("Creating NEW Supabase server client instance")

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Create admin client (alias for createServerSupabaseClient)
export const createAdminClient = () => {
  console.log("Creating NEW Supabase admin client instance")

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export default supabase
