import { createClient } from "@supabase/supabase-js"
import { env } from "./env"

// Server-side singleton
let serverSupabaseInstance: ReturnType<typeof createClient> | null = null

export const createServerSupabaseClient = () => {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (serverSupabaseInstance) {
    return serverSupabaseInstance
  }

  serverSupabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  return serverSupabaseInstance
}
