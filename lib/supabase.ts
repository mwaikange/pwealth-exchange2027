import { createClient } from "@supabase/supabase-js"
import { env, isSupabaseConfigured } from "./env"

// Client-side Supabase client
export const supabase = isSupabaseConfigured()
  ? createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null

// Server-side Supabase client with service role
export const supabaseAdmin =
  isSupabaseConfigured() && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null

// Helper function to get a configured client or throw an error
export function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please check your environment variables.")
  }
  return supabase
}

export function getSupabaseAdminClient() {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured. Please check your environment variables.")
  }
  return supabaseAdmin
}
