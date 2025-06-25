/**
 * Production-ready Supabase Client Configuration
 * Handles client-side Supabase initialization with proper error handling
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { clientEnv, validateClientEnv } from "./env"
import type { Database } from "@/types/supabase"

// Validate environment variables before initialization
if (!validateClientEnv()) {
  const errorMessage = `
🚨 SUPABASE CONFIGURATION ERROR 🚨

Missing required environment variables:
- NEXT_PUBLIC_SUPABASE_URL: ${clientEnv.NEXT_PUBLIC_SUPABASE_URL ? "✅" : "❌"}
- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅" : "❌"}

Please check your .env.local file and ensure these variables are set.
See .env.example for the required format.
  `
  console.error(errorMessage)
  throw new Error("Supabase configuration is incomplete. Check console for details.")
}

// Singleton pattern for client-side Supabase instance
let supabaseInstance: SupabaseClient<Database> | null = null

/**
 * Get or create the Supabase client instance
 * Uses singleton pattern to prevent multiple instances
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (typeof window === "undefined") {
    // Server-side: always create a new instance
    console.log("🔧 Creating server-side Supabase client")
    return createClient<Database>(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }

  // Client-side: maintain singleton
  if (!supabaseInstance) {
    console.log("🔧 Creating client-side Supabase singleton")
    supabaseInstance = createClient<Database>(
      clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          storageKey: "supabase-auth-token",
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          headers: {
            "X-Client-Info": "peer-wealth-token@1.0.0",
          },
        },
      },
    )

    // Log successful initialization
    console.log("✅ Supabase client initialized successfully", {
      url: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      keyLength: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY.length,
    })
  }

  return supabaseInstance
}

// Export the singleton client
export const supabase = getSupabaseClient()

// Default export for convenience
export default supabase

/**
 * Health check function to verify Supabase connection
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from("health_check").select("*").limit(1)
    if (error) {
      console.warn("⚠️ Supabase connection check failed:", error.message)
      return false
    }
    console.log("✅ Supabase connection verified")
    return true
  } catch (error) {
    console.error("❌ Supabase connection error:", error)
    return false
  }
}
