// Client-side environment variables (accessible in browser)
export const clientEnv = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_UR ||
    "https://vqdfhgjhptklwogjadxy.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "",
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    (typeof window !== "undefined" ? window.location.origin : ""),
}

// Server-side environment variables (never sent to client)
export const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KE || "",
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || "",
  POSTGRES_URL: process.env.POSTGRES_URL || "",
  POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL || "",
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING || "",
  POSTGRES_USER: process.env.POSTGRES_USER || "",
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "",
  POSTGRES_DATABASE: process.env.POSTGRES_DATABASE || "",
  POSTGRES_HOST: process.env.POSTGRES_HOST || "",
}

// Legacy export for backward compatibility (client-safe only)
export const env = clientEnv

// Debug logging for environment variables
if (typeof window === "undefined") {
  console.log("Environment variables loaded:", {
    supabaseUrl: clientEnv.NEXT_PUBLIC_SUPABASE_URL ? "✓" : "✗",
    supabaseAnonKey: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓" : "✗",
    serviceRoleKey: serverEnv.SUPABASE_SERVICE_ROLE_KEY ? "✓" : "✗",
  })
}
