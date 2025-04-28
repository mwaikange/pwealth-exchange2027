import { createClient } from "@supabase/supabase-js"
import { env } from "./env"

// Server-side singleton
let serverSupabaseInstance: ReturnType<typeof createClient> | null = null

export const createServerSupabaseClient = async () => {
  console.log("Creating server Supabase client with cookies")

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (serverSupabaseInstance) {
    return serverSupabaseInstance
  }

  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data } = await client.auth.getSession()
  console.log("Server Supabase session check:", data.session ? "Session found" : "No session")

  serverSupabaseInstance = client

  return serverSupabaseInstance
}
