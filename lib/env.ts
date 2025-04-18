// Ensure all environment variables are properly defined
export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_UR || "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KE || "",
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || "",
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "",

  // Database connection variables
  POSTGRES_URL: process.env.POSTGRES_URL || "",
  POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL || "",
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING || "",
  POSTGRES_USER: process.env.POSTGRES_USER || "",
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "",
  POSTGRES_DATABASE: process.env.POSTGRES_DATABASE || "",
  POSTGRES_HOST: process.env.POSTGRES_HOST || "",
}

// Validate required environment variables
const requiredEnvVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]

if (typeof window === "undefined") {
  // Only run on server
  for (const envVar of requiredEnvVars) {
    if (!env[envVar as keyof typeof env]) {
      console.warn(`Missing required environment variable: ${envVar}`)
    }
  }
}
