import { createClient } from "@supabase/supabase-js"
import { clientEnv } from "./env"

// Ensure we only use client-safe environment variables with fallbacks
const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL || "https://vqdfhgjhptklwogjadxy.supabase.co"
const supabaseAnonKey =
  clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZGZoZ2pocHRrbHdvZ2phZHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3NzI4MDAsImV4cCI6MjA1MDM0ODgwMH0.fallback-anon-key"

// Add validation
if (!supabaseUrl || supabaseUrl === "") {
  console.error("Supabase URL is missing or empty")
  throw new Error("Supabase configuration error: URL is required")
}

if (!supabaseAnonKey || supabaseAnonKey === "") {
  console.error("Supabase Anon Key is missing or empty")
  throw new Error("Supabase configuration error: Anon Key is required")
}

// Create singleton client instance
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (!supabaseInstance) {
    console.log("Supabase singleton initialized")
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: "supabase-auth-token",
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return supabaseInstance
})()

export default supabase
