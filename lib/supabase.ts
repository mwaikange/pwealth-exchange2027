import { createClient } from "@supabase/supabase-js"
import { env } from "./env"

// Use the actual environment variables from the workspace
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "https://vqdfhgjhptklwogjadxy.supabase.co"

const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || ""

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

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client
export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Admin client for server-side operations
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Default export for backward compatibility
export default supabase
