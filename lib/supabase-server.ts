/**
 * Server-side Supabase Client Configuration
 * For use in server components, API routes, and server actions
 */

import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { clientEnv, serverEnv, validateServerEnv } from "./env"
import type { Database } from "@/types/supabase"

/**
 * Create a Supabase client for server-side operations
 * Uses service role key for elevated permissions
 */
export const createServerSupabaseClient = () => {
  // Validate server environment
  if (!validateServerEnv()) {
    console.warn("⚠️ Server environment validation failed, using anon key")
  }

  const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY || clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required for server client")
  }

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server client")
  }

  console.log("🔧 Creating server Supabase client", {
    url: supabaseUrl,
    usingServiceRole: !!serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  })

  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "X-Client-Info": "peer-wealth-server@1.0.0",
      },
    },
  })
}

/**
 * Create a Supabase client with user context from cookies
 * For server components that need user authentication
 */
export const createServerSupabaseClientWithAuth = async () => {
  const cookieStore = cookies()
  const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase URL and anon key are required")
  }

  return createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  })
}

// Export convenience functions
export const serverSupabase = createServerSupabaseClient()
