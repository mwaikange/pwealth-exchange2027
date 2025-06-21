// Client-side environment variables (NEXT_PUBLIC_ prefix required)
export const clientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    (typeof window !== "undefined" ? window.location.origin : ""),
}

// Server-side only environment variables (no NEXT_PUBLIC_ prefix)
export const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || "",
  POSTGRES_URL: process.env.POSTGRES_URL || "",
  POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL || "",
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING || "",
  POSTGRES_USER: process.env.POSTGRES_USER || "",
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "",
  POSTGRES_DATABASE: process.env.POSTGRES_DATABASE || "",
  POSTGRES_HOST: process.env.POSTGRES_HOST || "",
}

// Validate client environment variables
if (typeof window !== "undefined") {
  // Only validate on client side
  if (!clientEnv.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
}

// Legacy export for backward compatibility (client-safe only)
export const env = clientEnv
