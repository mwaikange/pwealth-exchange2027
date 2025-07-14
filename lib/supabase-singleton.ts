import { createClient } from "@supabase/supabase-js"

// Use the actual environment variables that are available in the workspace
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_UR ||
  process.env.SUPABASE_URL ||
  "https://vqdfhgjhptklwogjadxy.supabase.co"

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""

// Add validation with better error messages
if (!supabaseUrl || supabaseUrl === "") {
  console.error(
    "Supabase URL is missing. Available env vars:",
    Object.keys(process.env).filter((key) => key.includes("SUPABASE")),
  )
  throw new Error("Supabase URL is required")
}

if (!supabaseAnonKey || supabaseAnonKey === "") {
  console.error(
    "Supabase Anon Key is missing. Available env vars:",
    Object.keys(process.env).filter((key) => key.includes("SUPABASE")),
  )
  throw new Error("Supabase Anon Key is required")
}

console.log("Supabase config:", {
  url: supabaseUrl,
  keyLength: supabaseAnonKey.length,
  keyPrefix: supabaseAnonKey.substring(0, 20) + "...",
})

// Create singleton client instance
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (!supabaseInstance) {
    console.log("Supabase singleton initialized")
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: "supabase-auth-token",
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return supabaseInstance
})()

export default supabase
