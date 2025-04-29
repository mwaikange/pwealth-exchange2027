import { createClient } from "@supabase/supabase-js"
import { env } from "./env"
import type { Database } from "@/types/supabase"

// Server-side singleton
let serverSupabaseInstance: ReturnType<typeof createClient> | null = null

export const createServerSupabaseClient = async () => {
  console.log("Creating server Supabase client with cookies")

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  if (serverSupabaseInstance) {
    return serverSupabaseInstance
  }

  const client = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  serverSupabaseInstance = client

  return serverSupabaseInstance
}

// Create a Supabase admin client with service role key
export const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
