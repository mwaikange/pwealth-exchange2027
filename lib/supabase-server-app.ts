import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { env } from "./env"

export const createServerClient = () => {
  const cookieStore = cookies()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      cookieOptions: {
        name: "sb-auth-token",
        domain: null,
        path: "/",
        secure: true,
      },
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  })
}
