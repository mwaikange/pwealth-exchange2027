/**
 * Environment Variables Configuration
 * Centralized environment variable management with validation and fallbacks
 */

// Type definitions for environment variables
interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_JWT_SECRET: string
  OPENAI_API_KEY: string
  NEXT_PUBLIC_SITE_URL: string
}

// Environment variables configuration
export const env: Env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vqdfhgjhptklwogjadxy.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000",
}

// Validate required environment variables
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const

for (const envVar of requiredEnvVars) {
  if (!env[envVar]) {
    console.warn(`Missing required environment variable: ${envVar}`)
  }
}

export default env

// Development mode checks
if (process.env.NODE_ENV === "development") {
  if (typeof window === "undefined") {
    // Server-side validation
    const missingServerVars = requiredEnvVars.filter((key) => !env[key])
    if (missingServerVars.length > 0) {
      console.warn("⚠️ Missing server environment variables:", missingServerVars)
    } else {
      console.log("✅ Server environment variables validated")
    }
  }
  // Client-side validation happens in the client components
}
