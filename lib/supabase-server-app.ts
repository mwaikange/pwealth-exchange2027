import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { clientEnv, serverEnv } from "./env"

export const createServerClient = () => {
  const cookieStore = cookies()
  const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  })
}
