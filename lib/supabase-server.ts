import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

export const createServerSupabaseClient = () => {
  const cookieStore = cookies()

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
      cookieOptions: {
        name: "sb-auth-token",
        domain: null,
        path: "/",
        secure: true,
      },
    },
  })
}
