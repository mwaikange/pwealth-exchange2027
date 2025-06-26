// Client-side environment variables (available in browser)
export const clientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000",
}

// Server-side environment variables (only available on server)
export const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
}

// Combined environment for backwards compatibility
export const env = {
  ...clientEnv,
  ...serverEnv,
}

// Validation functions
export function validateClientEnv() {
  return !!(clientEnv.NEXT_PUBLIC_SUPABASE_URL && clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function validateServerEnv() {
  return !!serverEnv.SUPABASE_SERVICE_ROLE_KEY
}

export function isSupabaseConfigured() {
  return validateClientEnv()
}

// Log configuration status (only in development)
if (process.env.NODE_ENV === "development") {
  console.log("🔧 Environment Configuration:", {
    supabaseUrl: !!clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: !!clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: !!serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    siteUrl: clientEnv.NEXT_PUBLIC_SITE_URL,
  })
}
