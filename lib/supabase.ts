import { createClient } from "@supabase/supabase-js"
import { clientEnv, serverEnv } from "./env"

// Client-side Supabase client (safe for browser)
const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Singleton for client-side
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (typeof window === "undefined") {
    // Server-side: always create new instance
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  }

  // Client-side: maintain singleton
  if (!supabaseInstance) {
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

// Export singleton
export const supabase = getSupabaseClient()

// Server-side client (only for server components/actions)
export const createServerSupabaseClient = () => {
  if (typeof window !== "undefined") {
    throw new Error("Server client cannot be used on client side")
  }

  const supabaseServiceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export default supabase
