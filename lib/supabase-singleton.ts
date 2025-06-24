import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Debug function to check auth status
export const checkAuthStatus = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  console.log("🔐 Auth Status:", {
    session: session ? "AUTHENTICATED" : "NOT AUTHENTICATED",
    user: session?.user?.email || "No user",
    error: error?.message || "No error",
  })
  return { session, error }
}
