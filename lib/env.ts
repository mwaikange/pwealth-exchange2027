/**
 * Environment Variables Configuration
 * Centralized environment variable management with validation and fallbacks
 */

// Type definitions for environment variables
interface ClientEnv {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  NEXT_PUBLIC_SITE_URL: string
}

interface ServerEnv {
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_JWT_SECRET: string
  POSTGRES_URL: string
  POSTGRES_PRISMA_URL: string
  POSTGRES_URL_NON_POOLING: string
  POSTGRES_USER: string
  POSTGRES_PASSWORD: string
  POSTGRES_DATABASE: string
  POSTGRES_HOST: string
}

// Client-side environment variables (accessible in browser)
export const clientEnv: ClientEnv = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_UR || process.env.SUPABASE_URL || "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
}

// Server-side environment variables (never sent to client)
export const serverEnv: ServerEnv = {
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

// Validation functions
export const validateClientEnv = (): boolean => {
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  const missing = required.filter((key) => !clientEnv[key as keyof ClientEnv])

  if (missing.length > 0) {
    console.error("❌ Missing required client environment variables:", missing)
    console.error(
      "Available Supabase env vars:",
      Object.keys(process.env).filter((key) => key.includes("SUPABASE")),
    )
    return false
  }

  console.log("✅ Client environment variables validated")
  return true
}

export const validateServerEnv = (): boolean => {
  const required = ["SUPABASE_SERVICE_ROLE_KEY"]
  const missing = required.filter((key) => !serverEnv[key as keyof ServerEnv])

  if (missing.length > 0) {
    console.warn("⚠️ Missing server environment variables:", missing)
    return false
  }

  console.log("✅ Server environment variables validated")
  return true
}

// Development mode checks
if (process.env.NODE_ENV === "development") {
  if (typeof window === "undefined") {
    // Server-side validation
    validateServerEnv()
  }
  // Client-side validation happens in the client components
}

// Legacy export for backward compatibility
export const env = clientEnv
