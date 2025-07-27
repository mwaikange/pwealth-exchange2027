// lib/supabase.ts
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate environment
if (!supabaseUrl) {
  throw new Error("❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env")
}
if (!supabaseAnonKey) {
  throw new Error("❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env")
}
if (!supabaseServiceKey) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY not set (used for server-side calls)")
}

// 🧠 Singleton for client-side
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (typeof window !== "undefined") {
    if (!supabaseInstance) {
      console.log("✅ Creating NEW Supabase client (client-side)")
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    }
    return supabaseInstance
  }

  // Server-side: always create new
  console.log("✅ Creating NEW Supabase client (server-side)")
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}

// Direct supabase export for convenience (usually client-side)
export const supabase = getSupabaseClient()

// Optional: for secure server calls (like admin APIs)
export const createServerSupabaseClient = () => {
  if (!supabaseServiceKey) {
    throw new Error("❌ Missing SUPABASE_SERVICE_ROLE_KEY for server-side Supabase usage")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
