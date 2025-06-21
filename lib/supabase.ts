import { createClient } from "@supabase/supabase-js"
import { clientEnv } from "./env"

// Client-side Supabase client
const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables")
}

// Create client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: "supabase_auth_token",
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export default supabase
